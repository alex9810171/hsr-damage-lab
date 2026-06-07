# Game Engine

本文記錄 HSR Damage Lab 的傷害計算流程與未來遊戲引擎拆分方向。內容以目前 V1 大黑塔單次傷害計算為基準。

## 傷害計算流程

建議流程如下：

1. 載入本地資料：角色、技能、光錐、遺器、詞條、隊伍 preset。
2. 從 UI 讀取輸入狀態：等級、技能、詞條、隊伍 Buff、敵人設定與角色特殊機制層數。
3. 建立計算 state：
   - 角色基礎攻擊力與光錐攻擊力。
   - 主詞條、副詞條、行跡、遺器、光錐、隊伍 Buff。
   - 敵人等級、防禦、抗性、易傷、減傷、韌性狀態。
   - 角色特殊機制，例如解讀層數與謎底層數。
4. 解析技能與每段 hit：
   - 技能倍率。
   - 目標數。
   - hit 重複次數。
   - 角色特殊機制對倍率或 Buff 的影響。
5. 計算各乘區。
6. 分 hit 計算非暴擊、暴擊與期望傷害。
7. 加總總傷害，並輸出 debug breakdown。

目前 `assets/js/calculator.js` 已執行大部分流程；未來應逐步拆成協調者、資料解析、技能解析、Buff 彙整與傷害引擎。

## 最終傷害公式

單段 hit 的建議公式：

```text
baseDamage =
  finalAtk
  * abilityMultiplier
  * targetCount
  * repeatCount

nonCritDamage =
  baseDamage
  * dmgBoostMultiplier
  * defenseMultiplier
  * resistanceMultiplier
  * vulnerabilityMultiplier
  * weakenMultiplier
  * mitigationMultiplier
  * brokenMultiplier

critDamage =
  nonCritDamage
  * (1 + critDamage)

expectedDamage =
  nonCritDamage
  * (1 + min(critRate, 100%) * critDamage)
```

總傷害為所有 hit 的對應欄位加總。

## 暴擊、非暴擊、期望傷害

- 非暴擊傷害：不乘暴擊傷害，只套用攻擊、技能倍率、增傷與敵方乘區。
- 暴擊傷害：非暴擊傷害乘上 `1 + critDamage`。
- 期望傷害：非暴擊傷害乘上 `1 + cappedCritRate * critDamage`。
- 暴擊率計入期望傷害時應限制在 `0%` 到 `100%`。

## Buff 分類

建議將 Buff 分成以下類型，避免全部混在單一公式中：

- 屬性 Buff：攻擊力百分比、固定攻擊力、暴擊率、暴擊傷害、速度、屬性增傷。
- 傷害類 Buff：通用增傷、技能增傷、終結技增傷、追加攻擊增傷、特定條件增傷。
- 敵方 Debuff：防禦降低、抗性降低、易傷、減傷降低。
- 無視類效果：防禦無視、抗性穿透。
- 條件型效果：依技能類型、敵人數、隊友命途、層數、是否破韌等條件生效。
- 角色特殊機制：只屬於特定角色的層數、轉換、追加倍率或額外 hit。

## 敵人乘區

目前 V1 需要支援下列敵人相關乘區。

### 防禦乘區

```text
defenseMultiplier =
  (characterLevel + 20)
  /
  ((enemyLevel + 20) * (1 - defenseReduction - defenseIgnore) + characterLevel + 20)
```

- `defenseReduction`：防禦降低。
- `defenseIgnore`：防禦無視。
- 兩者可先相加後限制在合理範圍，例如最高 `100%`。

### 抗性乘區

```text
resistanceMultiplier = 1 - (enemyResistance - resistancePenetration)
```

- `enemyResistance`：敵人對該屬性的抗性。
- `resistancePenetration`：抗性穿透或抗性降低後的等效值。

### 易傷乘區

```text
vulnerabilityMultiplier = 1 + vulnerability
```

易傷通常作為獨立乘區處理。

### 減傷乘區

```text
mitigationMultiplier = 1 - mitigation
```

若未來要支援減傷降低，應明確區分「敵人持有的減傷」與「降低減傷的效果」。

### 攻擊者造成傷害降低

```text
weakenMultiplier = 1 - weaken
```

這類效果表示攻擊者造成傷害降低，和敵方減傷應分成不同乘區。

### 破韌狀態

目前實作以 `targetBroken` 影響 `brokenMultiplier`：

```text
brokenMultiplier = targetBroken ? 1 : 0.9
```

未來若加入更完整韌性與擊破規則，應另建敵人狀態模型。

## 大黑塔特殊機制

V1 目前需要支援大黑塔單次傷害，包含下列特殊機制：

- 解讀層數：影響強化戰技中指定 hit 的倍率。
- 謎底層數：影響終結技 hit 的倍率。
- 終結技攻擊力提高 `80%`：目前資料位於 `data/characters/the-herta.json` 的 `ultimateAtkBuff`。
- 智識隊友數量：目前以 UI 狀態支援是否滿足特定智識隊友條件，並影響解讀層數加成。
- 技能 hit / 多段傷害：角色資料中的 `skills[].hits[]` 描述 hit、倍率、目標數與重複次數。
- 強化戰技滿解讀條件：目前有條件性增傷，例如解讀層數達指定門檻時額外增傷。
- 終結技敵人數倍率：目前終結技會依敵人數追加不同倍率。

這些機制目前部分集中在 `calculator.js`。後續多角色擴充時，建議移出通用傷害引擎。

## 多角色擴充方向

未來支援多角色時，建議使用以下分層：

- `calculator.js`：協調者，只負責組合流程。
- `damage-engine.js`：通用傷害公式、乘區、暴擊與 hit 加總。
- `buff-engine.js`：統一合併角色、光錐、遺器、隊伍與敵方 Buff。
- `skill-engine.js`：解析技能、hit、目標數、重複次數與技能類型。
- `character-resolvers/*.js`：集中處理特定角色機制。
- `data/characters/*.json`：角色資料與可資料化的技能/機制描述。

角色特殊機制不應散落在 UI、通用計算公式與 debug rendering 之中。若某機制無法完全資料化，應建立明確的 resolver，並只讓通用引擎接收 resolver 的結果。
