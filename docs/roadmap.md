# Roadmap

這份文件先規劃整體方向，再拆成可逐步執行的工作。原則是先讓資料結構穩定，再擴充角色、隊友與儲存功能。

## 目標

把目前的大黑塔單次傷害試算器，演進成可維護的《崩壞：星穹鐵道》角色傷害工具。

短期目標：

- 大黑塔資料完整且可 debug。
- 輸入方式以「來源」為主，不直接要求玩家手動 key 最終面板。
- 可部署於 GitHub Pages。
- 文件與 skill 能幫助換電腦或新對話後快速接續。

中期目標：

- 支援多角色。
- 支援隊友、星魂、專武、遺器效果資料化。
- 支援儲存配置與分享配置。

## 目前問題

- `assets/js/app.js` 已拆成入口、計算、UI、Debug 模組；後續仍需補測試。
- 角色與遺器資料已初步移到 JSON，後續需補更多角色與資料驗證流程。
- 組隊 UI 已有來源式欄位，但隊友技能/星魂/專武效果尚未完全資料化。
- 大黑塔角色等級目前不會改變角色白值，只影響防禦乘區。
- 尚未有測試案例，主要靠公式 Debug 人工檢查。

## 建議架構

第一階段維持純靜態網站，不引入 build step，確保 GitHub Pages 最簡單可用。

```text
hsr-damage-lab/
├── index.html
├── README.md
├── docs/
│   ├── project-notes.md
│   └── roadmap.md
├── data/
│   ├── characters/
│   │   └── the-herta.json
│   ├── light-cones.json
│   ├── relic-sets.json
│   ├── stat-values.json
│   └── teammates.json
└── assets/
    ├── css/
    │   └── styles.css
    └── js/
        ├── app.js
        ├── calculator.js
        ├── data-loader.js
        ├── formula-debug.js
        └── ui.js
```

拆分方向：

- `data/*.json`：遊戲資料。
- `calculator.js`：純計算邏輯，不直接碰 DOM。
- `data-loader.js`：載入 JSON 資料。
- `formula-debug.js`：產出公式 Debug 文字。
- `ui.js`：讀寫表單與渲染頁面。
- `app.js`：初始化與事件綁定。

隧洞遺器與位面飾品必須分開建模，並在計算時同時套用。

## 資料格式草案

角色資料：

```json
{
  "id": "1401",
  "name": "大黑塔",
  "element": "ice",
  "path": "erudition",
  "baseStats": {
    "80": {
      "atk": 679
    }
  },
  "traceStats": {
    "atkPercent": 18,
    "speed": 5,
    "iceDmg": 22.4
  },
  "skills": [],
  "traces": [],
  "eidolons": []
}
```

遺器資料：

```json
{
  "scholar": {
    "name": "識海迷墜的學者",
    "type": "cavern",
    "effects": {
      "twoPiece": {
        "critRate": 8
      },
      "fourPiece": {
        "skillDmg": 20,
        "ultimateDmg": 20,
        "nextSkillDmgAfterUltimate": 25
      }
    }
  }
}
```

隊友資料：

```json
{
  "robin": {
    "name": "知更鳥",
    "path": "harmony",
    "buffs": [],
    "eidolons": [],
    "signatureLightCone": {}
  }
}
```

## Skill 策略

專案內保留 skill 原始檔，讓換電腦或開新對話時能跟著 repo 走：

```text
.codex/
└── skills/
    ├── hsr-damage-calc/
    │   └── SKILL.md
    └── github-pages-static-site/
        └── SKILL.md
```

注意：不同 Codex 環境是否自動載入 repo 內 `.codex/skills` 可能不同。最穩做法是：

1. repo 保存 skill 原始檔。
2. 新電腦開發時，將需要的 skill 複製或安裝到使用者的 Codex skills 目錄。
3. skill 內容以專案工作流程與資料核對清單為主，不放過大的遊戲資料。

### hsr-damage-calc

用途：

- 修改 HSR 傷害公式。
- 新增角色、光錐、遺器、隊友資料。
- 核對大黑塔機制。
- 更新 Formula Debug。

核心內容：

- 傷害公式與乘區檢查清單。
- 大黑塔目前已知機制。
- 遺器二件/四件套不要漏的檢查提醒。
- 修改後同步文件與 GitHub Pages 的流程。

### github-pages-static-site

用途：

- 純 HTML/CSS/JS 專案部署到 GitHub Pages。
- 檢查 repo 結構與相對路徑。
- commit / push / Pages 部署檢查。

核心內容：

- GitHub Pages 設定。
- 部署成功條件。
- 常見 404 / CSS JS 載入失敗排查。
- published URL 文件同步。

## 優先順序

### Phase 1：穩定目前版本

- 確認大黑塔技能、附加能力、總屬性加成、遺器效果都列入公式 Debug。
- 移除不該由玩家裝備調整的欄位。
- 文件同步目前限制。
- 建立專案內 `.codex/skills`。

狀態：已完成初版。

### Phase 2：資料拆分

- 建立 `data/`。
- 將大黑塔資料從 `app.js` 移到 `data/characters/the-herta.json`。
- 將遺器、光錐、主詞條、副詞條數值移到 JSON。
- 新增 `data-loader.js`。

狀態：已完成初版。

### Phase 3：計算核心拆分

- 建立 `calculator.js`。
- 讓 calculator 接收 state/data，回傳 result。
- 保持 DOM 讀寫只在 UI 層。
- 保留 Formula Debug 並確保每個乘區可追蹤。
- 在頁面中顯示乘區係數摘要，例如攻擊區、倍率區、增傷區、暴擊期望、防禦、抗性、易傷、減傷、弱點。

狀態：已完成初版。

### Phase 4：組隊資料化

- 建立 `teammates.json`。
- 先支援指定隊伍：
  - 2+1 大黑塔：風套 + 翁瓦克
  - 0+0 那刻夏：風套 + 露莎卡
  - 1+0 緹寶：女武神 + 露莎卡
  - 0+1 風堇
- 每個隊友拆成技能、星魂、專武、遺器效果。
- 保留手動校正欄位作為 fallback。

狀態：已完成隊伍預設與露莎卡攻擊加成接線；隊友技能/星魂/專武效果待核對後補。

### Phase 5：儲存與分享

- `localStorage` 自動保存目前配置。
- 新增「儲存配置 / 載入配置 / 重設」。
- 新增匯出/匯入 JSON。
- 新增分享連結，用 URL query 保存配置。

### Phase 6：多角色支援

- 加角色列表。
- 角色切換時動態載入技能與特殊機制。
- 建立每個角色的公式 debug。

## 每次改動流程

1. 先確認資料來源或需求。
2. 先改資料，再改計算，再改 UI。
3. 更新 Formula Debug。
4. 更新 README / project notes / roadmap。
5. 檢查：

```powershell
git status --short --branch
git diff --stat
```

6. Commit。
7. Push。
8. 等 GitHub Pages deploy 成功。

## 暫不做

- 不急著引入 React/Vite。
- 不急著做雲端帳號登入。
- 不急著把所有角色一次補完。
- 不急著做 Cloudflare Pages，除非需要 Workers / KV / D1。
