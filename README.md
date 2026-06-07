# 星穹鐵道傷害試算

第一版是純靜態網站，先支援大黑塔單次傷害計算。資料以 JSON 載入，建議透過 GitHub Pages 或本機靜態伺服器開啟。

線上網站：https://alex9810171.github.io/hsr-damage-lab/

更多開發脈絡、公式假設與 TODO 請看 [`docs/project-notes.md`](docs/project-notes.md)，整體規劃請看 [`docs/roadmap.md`](docs/roadmap.md)。

## 專案結構

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
│   └── teams.json
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

## 已支援

- 大黑塔普攻、戰技、強化戰技、終結技
- 由角色、光錐、遺器主詞條、副詞條數量自動合成攻擊、暴率、暴傷、增傷
- 隧洞遺器與位面飾品可同時觸發，並支援 2 件/4 件套裝效果與副詞條數量粗估
- 終結技後攻擊力提高、2 智識隊伍、42 層解讀行跡增傷等情境開關；終結技攻擊 Buff 由角色資料提供
- 組隊來源欄位雛形：隊友、星魂、專武、輔助遺器效果
- 指定隊伍預設：2+1 大黑塔、0+0 那刻夏、1+0 緹寶、0+1 風堇
- 隊伍預設會同步實際隊友欄位；手動修改隊友後會切成自訂隊伍
- 敵人等級、防禦降低、防禦無視、抗性、易傷、減傷、弱點擊破
- 乘區係數摘要：攻擊區、倍率區、增傷區、暴擊期望、防禦、抗性、易傷、減傷、弱點，並顯示暴率/暴傷與目前減防
- 以目前面板做單步配置比較參考，不提供最佳化器

## 資料策略

目前角色、光錐、遺器、主詞條與隊伍資料放在 `data/`，計算邏輯放在 `assets/js/calculator.js`。

## GitHub Pages

把專案內容推到 GitHub repo 根目錄後，可以在 GitHub 設定：

```text
Settings > Pages > Deploy from a branch > main / root
```

目前網站網址：

```text
https://alex9810171.github.io/hsr-damage-lab/
```
