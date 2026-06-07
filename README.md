# 星穹鐵道傷害試算

第一版是純靜態網站，先支援大黑塔單次傷害計算。直接用瀏覽器開啟 `index.html` 即可使用，也可以部署到 GitHub Pages。

更多開發脈絡、公式假設與 TODO 請看 [`docs/project-notes.md`](docs/project-notes.md)。

## 專案結構

```text
hsr-damage-lab/
├── index.html
├── README.md
├── docs/
│   └── project-notes.md
└── assets/
    ├── css/
    │   └── styles.css
    └── js/
        └── app.js
```

## 已支援

- 大黑塔普攻、戰技、強化戰技、終結技
- 由角色、光錐、遺器主詞條、副詞條數量自動合成攻擊、暴率、暴傷、增傷
- 遺器套裝與副詞條數量的粗估
- 終結技後攻擊力提高、2 智識隊伍、42 層解讀行跡增傷等情境開關
- 敵人等級、防禦降低、防禦無視、抗性、易傷、減傷、弱點擊破
- 以目前面板比較下一步最佳補強方向

## 資料策略

目前角色資料寫在 `assets/js/app.js` 的 `character` 物件。之後要支援多角色時，建議改成 `data/characters/the-herta.json` 這類資料檔，再由介面載入角色。

## GitHub Pages

把專案內容推到 GitHub repo 根目錄後，可以在 GitHub 設定：

```text
Settings > Pages > Deploy from a branch > main / root
```
