# Project Notes

這份文件整理目前開發脈絡，方便換電腦、開新對話或未來上 GitHub 後繼續開發。

## 專案目標

建立一個《崩壞：星穹鐵道》角色傷害試算網站。第一版先支援大黑塔單次傷害計算，未來預計支援多角色、組隊試算、遺器最佳解分析與 GitHub Pages 部署。

## 目前範圍

- 純靜態網站，不需要 build step。
- 入口檔案是 `index.html`。
- 樣式放在 `assets/css/styles.css`。
- 計算邏輯與資料暫放在 `assets/js/app.js`。
- 第一版 UI 使用繁體中文。
- 專案資料夾名稱：`hsr-damage-lab`。
- 線上網站：https://alex9810171.github.io/hsr-damage-lab/

## 目前資料模型

角色資料目前直接寫在 `assets/js/app.js`：

- `character`：大黑塔技能、屬性、行跡數值。
- `relicSets`：遺器套裝效果。
- `lightCones`：光錐名稱與基礎攻擊。
- `mainStatValues`：五星 +15 遺器主詞條數值。
- `baseStats`：大黑塔 Lv.80 基礎攻擊、手部固定攻擊、基礎暴率、基礎暴傷。
- `rollValues`：副詞條平均值。

未來支援多角色時，建議改成：

```text
data/
├── characters/
│   └── the-herta.json
├── light-cones.json
├── relic-sets.json
└── stat-values.json
```

## 輸入設計決策

一開始曾使用「手動輸入最終面板」：

- 基礎攻擊力
- 固定攻擊力
- 攻擊力加成
- 暴擊率
- 暴擊傷害
- 冰傷 / 增傷

後來改成「來源輸入模式」，因為比較接近玩家實際使用方式，也比較能分析最佳解：

- 角色等級
- 角色
- 光錐
- 軀幹主詞條
- 腳部主詞條
- 位面球主詞條
- 連結繩主詞條
- 遺器套裝
- 副詞條數量
- 隊友 Buff
- 敵人狀態

系統再自動合成最終攻擊、暴率、暴傷與增傷。

## 傷害公式

目前公式拆法：

```text
單段基礎傷害 = 最終攻擊力 x 技能倍率 x 目標數 x 重複次數

非暴擊傷害 =
  單段基礎傷害
  x 增傷乘區
  x 防禦乘區
  x 抗性乘區
  x 易傷乘區
  x 我方傷害降低乘區
  x 敵方減傷乘區
  x 弱點擊破乘區

暴擊傷害 = 非暴擊傷害 x (1 + 暴擊傷害)

期望傷害 = 非暴擊傷害 x (1 + min(暴擊率, 100%) x 暴擊傷害)
```

防禦乘區：

```text
(角色等級 + 20) /
((敵人等級 + 20) x (1 - 防禦降低/無視) + 角色等級 + 20)
```

抗性乘區：

```text
1 - (敵人抗性 - 抗性穿透)
```

目前頁面底部有「公式 Debug」區塊，會即時列出每個來源、乘區和每段 Hit 的計算。

## 已知限制

- 大黑塔角色基礎攻擊目前固定使用 Lv.80 數值，角色等級尚未影響白值，只影響防禦乘區。
- 光錐資料只有少量選項，且只計入基礎攻擊。
- 光錐特效尚未實作。
- 遺器主詞條只支援輸出相關欄位，速度、能量恢復、擊破特攻目前不進傷害公式。
- 副詞條用平均值估算，尚未支援精準小詞條檔位。
- 大黑塔技能倍率與行跡效果目前是手動內建資料，尚未建立資料來源更新流程。
- 組隊功能目前是手動輸入 Buff，尚未選擇隊友角色。
- 未接入測試框架，目前靠公式 Debug 人工檢查。

## 下一步建議

1. 安裝 Git for Windows。
2. 建立 GitHub repo：`hsr-damage-lab`。
3. 初始化 git，commit 第一版並推送。
4. 到 GitHub Pages 啟用 `main / root` 部署。
5. 把資料從 `app.js` 拆到 `data/*.json`。
6. 補大黑塔不同技能等級、光錐疊影、星魂與隊友 Buff。
7. 加入可儲存/分享的 URL query 或 localStorage。
8. 補簡單測試案例，用固定輸入比對預期輸出。

## GitHub Pages

目前結構已相容 GitHub Pages。把 `hsr-damage-lab` 的內容放在 repo 根目錄後，可以設定：

```text
Settings > Pages > Deploy from a branch > main / root
```

目前網址：

```text
https://alex9810171.github.io/hsr-damage-lab/
```
