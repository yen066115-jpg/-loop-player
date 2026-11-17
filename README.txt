YouTube Loop Player(網頁版 / PWA)v1.0

貼上多個 YouTube 播放清單網址,依序輪播;最後一個清單播完回到第一個。
手機、電腦的瀏覽器都能用,可「加入主畫面」當成 App 使用。

【一、放到網路上(必要)】
YouTube 嵌入播放器不能在「直接雙擊 index.html」(file://)的情況下運作,必須放在 https 網址。
最簡單的免費方式:GitHub Pages
 1. 註冊/登入 GitHub,按右上角 + →「New repository」,取名例如 loop-player,設為 Public,建立。
 2. 在新 repository 頁面按「uploading an existing file」,把本資料夾「裡面的所有檔案」(index.html、app.js、style.css、sw.js、manifest.webmanifest、icons 資料夾)拖進去,按 Commit changes。
 3. 到 Settings → Pages,Source 選「Deploy from a branch」,Branch 選 main、資料夾選 / (root),按 Save。
 4. 等 1~2 分鐘,頁面會顯示你的網址:https://你的帳號.github.io/loop-player/
 (也可以用 Netlify、Cloudflare Pages 等,把整個資料夾拖上去即可。)

【二、在手機上使用】
iPhone(Safari):開啟網址 → 點下方「分享」按鈕 →「加入主畫面」。
Android(Chrome):開啟網址 → 右上角選單 →「安裝應用程式」或「加到主畫面」。
電腦:直接用瀏覽器開啟網址即可。

【三、使用方式】
 1. 貼上含 list= 的播放清單網址(或直接貼清單 ID),按「＋ 新增播放清單」可加入多個。
 2. 按「▶ 開始輪播」。
 3. 手機瀏覽器第一次需要手動點一下播放器的播放鍵,之後的清單切換會自動進行。
 4. 「播放清單循環」關閉時,最後一個清單播完就會停止。
 5. 「播放時保持螢幕不關閉」開啟時,會要求螢幕保持亮著(需瀏覽器支援)。
 - 「循環」與「保持螢幕」勾選後立即生效;清單內容需按「儲存設定」。

【四、限制與注意事項】
- 手機鎖定螢幕或切換到其他 App 後,網頁中的影片通常會暫停,請保持螢幕亮著、頁面在前景。
- 部分影片(例如部分音樂 MV)禁止被嵌入,會自動跳過;私人清單無法播放。
- 不支援 YouTube 自動合輯(list 以 RD 開頭)。
- 請把 YouTube 清單本身的「循環播放」關閉(嵌入播放器預設即為關閉)。
- 嵌入播放器仍可能顯示廣告。
- 本工具僅提供連續播放的便利功能,不保證、也不影響 YouTube 如何計算觀看次數。使用時請遵守 YouTube 服務條款。

【隱私】
- 不收集、不傳送任何個人資料,無分析或追蹤工具。
- 播放清單與設定只存在你自己的瀏覽器(localStorage)。
- 影片播放由 YouTube 嵌入播放器提供,適用 YouTube 的隱私權政策。

【更新】
重新上傳覆蓋檔案後,關閉再開啟頁面即可(必要時重新整理一次)。
