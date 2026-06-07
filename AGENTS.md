# AGENTS.md

## 專案目標

HSR Damage Lab 是一個可直接部署到 GitHub Pages 的崩壞：星穹鐵道傷害試算工具。

第一版目標是維持純靜態網站，先支援大黑塔的單次傷害計算，並保留後續擴充到多角色、隊伍 Buff、敵人設定、遺器與光錐資料的空間。

## V1 技術限制

- 維持純靜態 HTML/CSS/JavaScript。
- 不引入 React、Vite、TypeScript 或其他前端框架。
- 不新增 `package.json`、npm scripts、build step 或 bundler。
- 網站應能以目前方式直接由 GitHub Pages 從 repository root 部署。
- 資料以本地 JSON 維護，不依賴執行時即時爬取外部資料。

## Codex / AI Agent 工作規則

- 本專案目前優先採小步修改，避免一次性大重構。
- 修改前先閱讀現有檔案職責與資料流，不要假設專案已改成框架式架構。
- 文件、資料、UI、計算邏輯應盡量分離；如果目前實作尚未完全分離，先記錄差異，再逐步改善。
- 不要在沒有明確需求時改變啟動方式、部署方式或 GitHub Pages 結構。
- 不要主動新增依賴或工具鏈。
- 不要把角色資料硬寫進 UI。
- 不要把傷害公式直接寫在 UI 裡。
- 如果需要處理角色特殊機制，應集中到 `skill-engine.js`、角色專用 resolver，或其他明確的 engine/resolver 模組；不要散落在 `ui.js`、`calculator.js`、`damage-engine.js` 各處。
- 如果現有檔案尚未拆到上述目標狀態，先保持功能可運作，再以小步驟拆分。

## 檔案職責說明

目前專案結構為純靜態網站：

- `index.html`：主要頁面與表單結構。
- `assets/css/styles.css`：樣式。
- `assets/js/app.js`：入口點，載入資料後建立 UI。
- `assets/js/data-loader.js`：以 `fetch()` 載入本地 JSON 資料。
- `assets/js/ui.js`：DOM 綁定、表單讀取、畫面更新、preset 套用與 debug 顯示串接。
- `assets/js/calculator.js`：目前負責讀取輸入狀態、套用資料、計算傷害乘區、處理部分大黑塔特殊機制與隊伍 Buff。
- `assets/js/formula-debug.js`：輸出公式 debug 文字。
- `data/characters/the-herta.json`：目前的大黑塔角色資料。
- `data/light-cones.json`：光錐資料。
- `data/relic-sets.json`：遺器與位面飾品資料。
- `data/stat-values.json`：基礎數值、主詞條、副詞條等數值。
- `data/teams.json`：目前的隊伍 preset。
- `docs/`：專案規劃、架構與設計決策文件。

## 資料與邏輯原則

- 角色資料應放在 `data/characters/*.json`。
- UI 不應硬寫角色資料、技能倍率、角色天賦條件或命座效果。
- 傷害公式不應直接寫在 UI 裡。
- `calculator.js` 未來應逐步變成協調者：接收資料與輸入，呼叫資料解析、技能解析、Buff 彙整、傷害引擎，再回傳結果。
- 通用乘區、敵人防禦/抗性/易傷/減傷、暴擊與期望傷害應集中在傷害引擎。
- 角色特殊機制可以存在，但應集中管理，例如：
  - `skill-engine.js`
  - `character-resolvers/the-herta.js`
  - `mechanics-resolvers/*.js`

## 重構原則

- 每次只拆一小塊，並保持現有功能可運作。
- 優先把「純函式計算」從 DOM 操作中分離。
- 優先補文件與測試資料案例，再移動公式。
- 移動公式時應保留可比較的輸出，例如 normal、crit、expected、per-hit breakdown 與 formula debug。
- 不要為了架構漂亮而同時重寫 UI、資料格式與公式。
- 如果現有實作和目標架構不同，先在 `docs/DECISIONS.md` 或相關文件記錄，再安排後續小步調整。
