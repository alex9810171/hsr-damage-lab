# Decisions

本文記錄目前已確定的架構決策。若後續決策改變，請新增日期與原因，不要直接刪除舊脈絡。

## 2026-06-07

### V1 維持純靜態網站

目前專案維持 `index.html`、`assets/css/styles.css`、`assets/js/*.js` 與 `data/*.json` 的純靜態結構。網站應可直接由 GitHub Pages 從 repository root 部署。

### 暫時不改 React

V1 不引入 React、Vite、TypeScript、npm build step 或其他前端框架。這能降低部署與維護成本，也符合目前 GitHub Pages 靜態部署方式。

### 不即時爬取 Nanoka 資料

角色、光錐、遺器與隊伍資料先以本地 JSON 維護。未來若要參考外部資料來源，也應先轉成可審查的本地資料，不在前端執行時即時爬取。

### 先做單次傷害，不做回合軸

第一版聚焦大黑塔單次傷害計算，包含技能 hit、暴擊/非暴擊/期望傷害、敵人乘區與必要角色特殊機制。暫時不做行動序、Buff 持續時間、能量循環或完整戰鬥模擬。

### 先補文件，再逐步拆分 calculator.js

目前 `assets/js/calculator.js` 同時包含狀態彙整、通用傷害公式、敵人乘區、部分隊伍 Buff 與大黑塔特殊機制。短期先補齊文件與資料模型方向，後續再小步拆分。

### calculator.js 未來作為協調者

長期方向是讓 `calculator.js` 負責協調流程，而不是塞滿所有公式。建議逐步拆出：

- `damage-engine.js`：通用傷害公式與乘區。
- `skill-engine.js`：技能與 hit 解析。
- `buff-engine.js`：Buff 彙整。
- `character-resolvers/*.js`：角色特殊機制。

### 允許角色特殊機制，但必須集中管理

大黑塔的解讀層數、謎底層數、終結技攻擊力提高、智識隊友條件與依敵人數改變倍率等機制可以存在，但應集中管理。不要讓同一角色規則散落在 `ui.js`、`calculator.js`、`formula-debug.js` 與未來的 engine 檔案中。

### UI 不應硬寫角色資料或公式

UI 可以負責呈現欄位、讀取輸入與渲染結果，但不應直接硬寫角色技能倍率、角色特殊公式、Buff 規則或敵人乘區。若目前 UI 中存在 preset 或呈現文字，後續應逐步改由資料或計算結果驅動。

## 目前觀察到的落差

- `calculator.js` 目前仍包含多種職責，和未來「協調者」目標不同。
- 大黑塔部分特殊機制目前仍在 `calculator.js` 內處理，未集中到 `skill-engine.js` 或角色 resolver。
- `formula-debug.js` 目前輸出公式細節，未來拆分公式時需要同步保持 debug 文字與計算來源一致。
- `ui.js` 目前包含 preset 套用與隊伍欄位同步，後續若支援多角色，部分邏輯可能需要資料化或移到資料解析層。
- 現有 `README.md` 與既有 docs 在目前終端環境顯示為亂碼；本次不修改既有文件內容，以避免破壞原始編碼。
