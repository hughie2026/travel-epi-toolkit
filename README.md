# 旅行流行病學工具箱 Travel Epidemiology Toolkit

給研究者、旅遊醫學醫師與公共衛生人員使用的開源建模工具網站。所有計算都在使用者的瀏覽器中執行，不需要後端伺服器，也不會上傳任何輸入資料。

## 功能

| 頁面 | 內容 |
|---|---|
| 基礎計算 `calculators.html` | 2×2 表（RR、OR、RD、可歸因分率）、Poisson 精確信賴區間、發生率比、樣本數 |
| 行程風險 `travel-risk.html` | 多段行程的感染機率、防護措施的絕對風險降低與需治療人數 |
| 輸出病例 `importation.html` | 以海外確診旅客反推來源地病例數（Imai 等 2020），估算各目的地預期輸入病例 |
| 爆發機率 `branching.html` | 負二項分支過程，計算輸入病例引發持續傳播的機率 |
| SEIR 模擬 `seir.html` | 封閉族群（郵輪、旅行團）的確定性與 Gillespie 隨機模擬 |
| 檢疫策略 `quarantine.html` | 檢疫天數與檢測時點組合的蒙地卡羅模擬 |
| 空氣傳播 `airborne.html` | Wells–Riley 與 Rudnick–Milton（CO₂）模型 |
| 即時 Rt `rt.html` | Cori 等（2013）方法，區分本土與輸入病例 |
| 成本效益 `economics.html` | 決策樹、ICER、機率敏感度分析、CEAC、EVPI、龍捲風圖 |
| 跨風險比較 `comparison.html` | 傳染病、傷害、慢性病事件換算成每 10 萬名旅客；道路交通風險比較 |
| 方法與文獻 `about.html` | 各模型的公式、假設、限制與參考文獻 |
| 模型驗證 `tests.html` | 用解析解與已發表結果檢查計算正確性 |

## 檔案結構

```
travel-epi-toolkit/
├── index.html
├── calculators.html
├── travel-risk.html
├── importation.html
├── branching.html
├── seir.html
├── quarantine.html
├── airborne.html
├── rt.html
├── economics.html
├── comparison.html
├── about.html
├── tests.html
├── assets/
│   ├── css/style.css
│   └── js/
│       ├── epi.js        數值方法與模型核心（不依賴 DOM）
│       └── layout.js     共用頁首、選單、頁尾與介面工具
└── README.md
```

## 部署到 GitHub Pages

1. 在 GitHub 建立新的 repository，例如 `travel-epi-toolkit`。
2. 把所有檔案依上述結構放進 repository 根目錄，提交並推送到 `main` 分支。
3. 到 repository 的 **Settings → Pages**，在 **Build and deployment** 選擇 **Deploy from a branch**，分支選 `main`，資料夾選 `/ (root)`，按 **Save**。
4. 約一至兩分鐘後，網站會出現在 `https://<你的帳號>.github.io/travel-epi-toolkit/`。
5. 部署後先開啟 `tests.html`，確認所有測試都通過。

不需要安裝 Node.js，也沒有建置步驟。

## 在本機執行

直接用瀏覽器開啟 HTML 檔通常可以運作。若遇到瀏覽器的本機檔案限制，請在專案資料夾啟動簡易伺服器：

```bash
python3 -m http.server 8000
```

再開啟 `http://localhost:8000`。

## 外部相依套件

圖表使用 [Plotly.js](https://plotly.com/javascript/) 2.35.2，從 `cdn.plot.ly` 載入。若需要離線使用或不想依賴 CDN：

1. 下載 `plotly-2.35.2.min.js`，放到 `assets/vendor/`。
2. 把各頁面的 `<script src="https://cdn.plot.ly/plotly-2.35.2.min.js">` 改成 `<script src="assets/vendor/plotly-2.35.2.min.js">`。

## 驗證

`tests.html` 會檢查：

- 特殊函數（常態分位數、不完全伽瑪函數）與解析值的差異
- Poisson 精確信賴區間與 Garwood（1936）表列值
- 分支過程滅絕機率與解析解（幾何分佈 q = 1/R）
- SEIR 確定性模型的最終規模與 final size 方程式
- Gillespie 模擬的大規模爆發比例與理論值 1 − 1/R₀
- Cori 法在合成資料上能否還原已知的 Rt
- Imai 等（2020）報告中的點估計

修改 `epi.js` 後請重新執行測試。新增模型時，請一併加入至少一項以解析解或文獻數值為依據的測試。

## 新增模型的做法

1. 在 `assets/js/epi.js` 加入只依賴輸入參數的純函式，並加到檔案末端的匯出物件。
2. 複製一個現有頁面（例如 `branching.html`）作為範本，修改表單與結果區。
3. 在 `assets/js/layout.js` 的 `PAGES` 陣列加入新頁面，選單會自動更新。
4. 在 `tests.html` 加入驗證測試，在 `about.html` 加入方法說明與文獻。

## 使用限制

- 頁面中標示「示例」的預設值只用來展示介面，不是實際流行病學數據。正式分析請換成文獻或監測資料，並在報告中註明來源。
- 本工具僅供教育與研究用途，不能取代醫師的個別評估或衛生主管機關的正式建議。

## 授權

程式碼以 MIT 授權釋出，請在 repository 根目錄新增 `LICENSE` 檔（GitHub 建立檔案時可選擇 MIT 範本）。引用的資料與參數請遵守各原始來源的授權條款。

版面配色參考紐約大學網站風格。本專案與紐約大學無任何關聯，也未使用其名稱或標誌。
