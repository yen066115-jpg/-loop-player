(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const STORE = 'yplWeb.v1';
  const state = { playlists: [], loop: true, wake: true };

  let player = null, playerReady = false, apiPromise = null;
  let running = false, idx = 0, advancing = false, errorStreak = 0, lastState = -2;
  let endTimer = null, hintTimer = null, wakeLock = null;

  const safe = fn => { try { return fn(); } catch { return undefined; } };

  // ---------- 設定 ----------
  function loadSettings() {
    try { Object.assign(state, JSON.parse(localStorage.getItem(STORE) || '{}')); } catch { /* ignore */ }
    if (!Array.isArray(state.playlists)) state.playlists = [];
  }
  function saveSettings() { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch { /* ignore */ } }

  // ---------- 清單輸入 ----------
  const listEl = $('list'), statusEl = $('status');
  const setStatus = text => { statusEl.textContent = text || ''; };

  function row(value = '') {
    const d = document.createElement('div'); d.className = 'row';
    const input = document.createElement('input');
    input.type = 'text'; input.placeholder = '貼上 YouTube 播放清單 URL'; input.value = value;
    input.autocomplete = 'off'; input.autocapitalize = 'off'; input.spellcheck = false;
    const remove = document.createElement('button');
    remove.type = 'button'; remove.title = '刪除'; remove.textContent = '×';
    remove.onclick = () => d.remove();
    d.append(input, remove); listEl.appendChild(d);
  }

  function parseListId(raw) {
    raw = raw.trim(); if (!raw) return null;
    if (/^[A-Za-z0-9_-]{10,}$/.test(raw)) return raw;           // 直接貼清單 ID
    try {
      const u = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : 'https://' + raw);
      const host = u.hostname.replace(/^(www|m|music)\./, '');
      if (host === 'youtube.com' || host === 'youtu.be' || host === 'youtube-nocookie.com') {
        const id = u.searchParams.get('list');
        if (id && /^[A-Za-z0-9_-]+$/.test(id)) return id;
      }
    } catch { /* ignore */ }
    return null;
  }

  function readRows() {
    const raw = [...listEl.querySelectorAll('input')].map(x => x.value.trim()).filter(Boolean);
    const ids = [];
    for (const r of raw) {
      const id = parseListId(r);
      if (!id) return { error: '有播放清單連結格式不正確,請確認網址包含 list=。' };
      if (id.startsWith('RD')) return { error: '不支援 YouTube 自動合輯(list 以 RD 開頭),請改用一般播放清單。' };
      ids.push(id);
    }
    if (new Set(ids).size !== ids.length) return { error: '請勿重複加入相同的播放清單。' };
    return { ids };
  }

  // ---------- YouTube IFrame API ----------
  function loadApi() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (apiPromise) return apiPromise;
    apiPromise = new Promise((resolve, reject) => {
      window.onYouTubeIframeAPIReady = resolve;
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.onerror = () => { apiPromise = null; reject(new Error('無法載入 YouTube 播放器,請檢查網路連線。')); };
      document.head.appendChild(s);
    });
    return apiPromise;
  }

  function createPlayer(listId) {
    $('playerWrap').hidden = false;
    player = new YT.Player('player', {
      width: '100%', height: '100%',
      playerVars: { listType: 'playlist', list: listId, autoplay: 1, playsinline: 1, rel: 0, loop: 0 },
      events: { onReady, onStateChange, onError }
    });
  }

  function onReady() {
    playerReady = true;
    safe(() => player.setLoop(false));
    safe(() => player.playVideo());
  }

  function playList(i) {
    idx = i; advancing = false; clearTimeout(endTimer);
    const id = state.playlists[i];
    renderProgress();
    if (!player) { createPlayer(id); return; }
    player.loadPlaylist({ listType: 'playlist', list: id, index: 0 });
    safe(() => player.setLoop(false));
  }

  function renderProgress() {
    const n = state.playlists.length;
    let text = `第 ${idx + 1}/${n} 個清單`;
    const pl = safe(() => player.getPlaylist()), i = safe(() => player.getPlaylistIndex());
    if (Array.isArray(pl) && pl.length && Number.isInteger(i) && i >= 0) text += ` · 第 ${i + 1}/${pl.length} 首`;
    setStatus('輪播中:' + text);
  }

  // 切換到下一個清單;最後一個清單播完則回到第一個(未開啟循環則結束)
  function advance() {
    if (advancing) return;
    advancing = true; clearTimeout(endTimer);
    let next = idx + 1;
    if (next >= state.playlists.length) {
      if (!state.loop) { finish('全部清單已播完。'); return; }
      next = 0;
    }
    playList(next);
  }

  function onStateChange(e) {
    if (!running) return;
    lastState = e.data;
    const S = YT.PlayerState;
    if (e.data === S.PLAYING) { errorStreak = 0; clearTimeout(hintTimer); renderProgress(); }
    else if (e.data === S.ENDED) handleEnded();
  }

  function handleEnded() {
    if (advancing) return;
    const pl = safe(() => player.getPlaylist()), i = safe(() => player.getPlaylistIndex());
    const known = Array.isArray(pl) && pl.length > 0 && Number.isInteger(i);
    if (known && i >= pl.length - 1) { advance(); return; }      // 清單最後一首 -> 立即切換
    // 清單還有下一首:YouTube 通常會自動接續;4 秒後仍停在結束狀態才手動處理
    clearTimeout(endTimer);
    endTimer = setTimeout(() => {
      if (!running || advancing) return;
      if (safe(() => player.getPlayerState()) !== YT.PlayerState.ENDED) return;
      if (known) player.nextVideo(); else advance();
    }, 4000);
  }

  function onError() {
    if (!running) return;
    if (++errorStreak > 25) { finish('連續多個影片無法播放,已停止。請確認清單是公開的,且影片允許嵌入播放。'); return; }
    const vid = safe(() => player.getVideoData().video_id);
    setTimeout(() => {
      if (!running || advancing) return;
      if (safe(() => player.getVideoData().video_id) !== vid) return;   // YouTube 已自行跳到下一首
      const pl = safe(() => player.getPlaylist()), i = safe(() => player.getPlaylistIndex());
      if (Array.isArray(pl) && pl.length && Number.isInteger(i) && i < pl.length - 1) player.nextVideo();
      else advance();
    }, 1500);
  }

  // ---------- 螢幕常亮 ----------
  async function acquireWake() {
    if (!state.wake || !running || wakeLock || !('wakeLock' in navigator)) return;
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } catch { wakeLock = null; }
  }
  function releaseWake() { try { if (wakeLock) wakeLock.release(); } catch { /* ignore */ } wakeLock = null; }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && running) acquireWake();
  });

  // ---------- 控制 ----------
  function finish(message) {
    running = false; clearTimeout(endTimer); clearTimeout(hintTimer); releaseWake();
    setStatus(message);
  }

  $('add').onclick = () => row();

  $('save').onclick = () => {
    const r = readRows(); if (r.error) { setStatus(r.error); return; }
    state.playlists = r.ids; saveSettings();
    if (running) { if (idx >= state.playlists.length) idx = Math.max(0, state.playlists.length - 1); renderProgress(); }
    setStatus('設定已儲存');
  };

  $('loop').onchange = () => { state.loop = $('loop').checked; saveSettings(); };
  $('wake').onchange = () => {
    state.wake = $('wake').checked; saveSettings();
    if (state.wake) acquireWake(); else releaseWake();
  };

  $('start').onclick = async () => {
    const r = readRows(); if (r.error) { setStatus(r.error); return; }
    if (!r.ids.length) { setStatus('請先加入至少一個播放清單。'); return; }
    state.playlists = r.ids; state.loop = $('loop').checked; state.wake = $('wake').checked; saveSettings();
    if (player && !playerReady) return;
    if (!(window.YT && window.YT.Player)) {
      setStatus('載入播放器…');
      try { await loadApi(); } catch (e) { setStatus(e.message); return; }
    }
    running = true; errorStreak = 0; lastState = -2;
    acquireWake();
    playList(0);
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => {
      if (running && lastState !== YT.PlayerState.PLAYING) setStatus('若沒有自動播放,請點一下播放器上的播放鍵(手機瀏覽器第一次需要手動操作)。');
    }, 4000);
  };

  $('stop').onclick = () => {
    finish('已停止輪播');
    safe(() => player.stopVideo());
  };

  // ---------- 初始化 ----------
  loadSettings();
  $('loop').checked = !!state.loop; $('wake').checked = !!state.wake;
  state.playlists.forEach(id => row(`https://www.youtube.com/playlist?list=${id}`));
  if (!state.playlists.length) row();
  loadApi().catch(() => { /* 按下開始時會再試並顯示錯誤 */ });

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* ignore */ });
  }
})();
