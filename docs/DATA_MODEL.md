# Data Model

本文提供未來資料模型建議。這些 JSON 範例是建議格式，不要求本次任務建立或改動實際資料檔。

目前專案已存在：

- `data/characters/the-herta.json`
- `data/light-cones.json`
- `data/relic-sets.json`
- `data/stat-values.json`
- `data/teams.json`

未來可在保持純靜態 JSON 的前提下逐步整理格式。

## Character JSON 建議格式

角色資料應放在 `data/characters/*.json`。

```json
{
  "id": "the-herta",
  "gameId": "1401",
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
  "mechanics": {}
}
```

## Skill / Hit 建議格式

```json
{
  "id": "enhanced-skill",
  "name": "強化戰技",
  "type": "skill",
  "enhanced": true,
  "hits": [
    {
      "id": "main-target",
      "label": "主目標",
      "multiplier": 100,
      "targets": 1,
      "repeats": 1,
      "scalesWith": "atk",
      "tags": ["skill", "enhanced"],
      "mechanics": [
        {
          "id": "interpretation-main",
          "type": "addMultiplierPerStack",
          "stackKey": "interpretationStacks",
          "valuePerStack": 20,
          "condition": "twoErudition"
        }
      ]
    },
    {
      "id": "adjacent-targets",
      "label": "相鄰目標",
      "multiplier": 100,
      "targets": 2,
      "repeats": 2,
      "scalesWith": "atk",
      "tags": ["skill", "enhanced", "blast"]
    }
  ]
}
```

欄位建議：

- `type`：`basic`、`skill`、`ultimate`、`followUp` 等。
- `hits`：多段傷害應拆成多個 hit。
- `targets`：可使用數字或 `"all"`。
- `targetPattern`：V1 開始可用來表示命中列，例如 `center`、`adjacent`、`all`。
- `mechanicRow`：表示該 hit 是角色機制列，例如大黑塔強化戰技的解讀層數倍率。
- `repeats`：同一段 hit 重複次數。
- `tags`：供 Buff 條件判斷。
- `mechanics`：只放可資料化的技能特殊規則。

## V1 技能命中分布

V1 已開始支援技能命中分布。大黑塔戰技與強化戰技不能只用 `targets` / `repeats`
表示，因為 5 敵時主目標、相鄰目標與外側目標的總倍率不同。

目前大黑塔資料使用 `targetPattern` 表示每一列命中：

- `center`：只命中主目標。
- `adjacent`：命中主目標與相鄰目標。
- `all`：命中目前敵人全體。
- `mechanicRow: "interpretation"`：強化戰技解讀列，依解讀層數、2 智識與一魂開關計算。

未來多角色若有更複雜的站位、彈射或隨機目標規則，應交給 `skill-engine.js` 或角色
resolver 處理，不應把特殊分布散落在 UI。

## Buff 建議格式

```json
{
  "id": "ultimate-atk-buff",
  "label": "終結技後攻擊力提高",
  "source": "character",
  "target": "self",
  "stats": {
    "atkPercent": 80
  },
  "duration": {
    "type": "state",
    "stateKey": "afterUltimate"
  },
  "conditions": [
    {
      "key": "afterUltimate",
      "equals": true
    }
  ]
}
```

建議 Buff 欄位：

- `source`：`character`、`lightCone`、`relic`、`team`、`enemy`。
- `target`：`self`、`team`、`enemy`。
- `stats`：攻擊、暴擊、增傷、防禦降低、易傷等數值。
- `conditions`：生效條件。
- `duration`：若未來做回合軸，再擴充持續時間與回合邏輯。

## Team Buff 建議格式

```json
{
  "id": "the-herta-default",
  "label": "大黑塔預設隊伍",
  "members": [
    {
      "slot": 1,
      "characterId": "the-herta",
      "role": "damageDealer"
    },
    {
      "slot": 2,
      "characterId": "tribbie",
      "eidolon": 0,
      "lightConeId": "signature",
      "relicSets": ["fleet-of-the-ageless"],
      "buffs": [
        {
          "id": "team-crit-damage",
          "stats": {
            "critDamage": 80
          }
        }
      ]
    }
  ]
}
```

隊伍 preset 可以先維持簡化格式，但應避免讓 UI 直接理解角色專屬規則。

## Relic Set 建議格式

```json
{
  "id": "scholar",
  "name": "識海迷墜的學者",
  "type": "cavern",
  "effects": [
    {
      "pieces": 2,
      "stats": {
        "critRate": 8
      }
    },
    {
      "pieces": 4,
      "stats": {
        "skillDmg": 20,
        "ultimateDmg": 20
      }
    },
    {
      "pieces": 4,
      "stats": {
        "nextSkillDmgAfterUltimate": 25
      },
      "conditions": [
        {
          "key": "afterUltimate",
          "equals": true
        }
      ]
    }
  ]
}
```

V1 遺器與位面飾品資料可加入 `supportStatus` 與 `notes`：

- `已支援`：目前效果已接入單次傷害計算。
- `部分支援`：只支援會影響 V1 單次傷害的部分，不套用未確認或未模擬效果。
- `待核對`：資料或公式未確認，不自動套用效果。

不確定資料應標 TODO 或 `notes`，不應臆測補入計算。

## Light Cone 建議格式

```json
{
  "id": "the-herta-signature",
  "name": "向著不可追問處",
  "path": "erudition",
  "baseAtk": 635,
  "superimposition": {
    "1": {
      "buffs": [
        {
          "id": "light-cone-crit-rate",
          "stats": {
            "critRate": 12
          }
        },
        {
          "id": "light-cone-after-ultimate-dmg",
          "stats": {
            "skillDmg": 60,
            "ultDmg": 60
          },
          "duration": {
            "type": "turn",
            "value": 3
          },
          "conditions": [
            {
              "key": "afterUltimate",
              "equals": true
            }
          ]
        }
      ]
    }
  },
  "conditions": []
}
```

V1 目前實際資料可先使用扁平格式，例如：

```json
{
  "signature": {
    "label": "向著不可追問處",
    "baseAtk": 635,
    "critRate": 12,
    "afterUltimateBuff": {
      "skillDmg": 60,
      "ultDmg": 60,
      "duration": 3,
      "condition": "afterUltimate"
    }
  }
}
```

光錐可先資料化基礎攻擊與固定 Buff；複雜條件可交給 resolver。
如果光錐效果尚未確認，應以 `todo` 記錄，不要猜公式。

## Enemy State 建議格式

```json
{
  "level": 95,
  "count": 3,
  "elementResistance": {
    "ice": 0
  },
  "defenseReduction": 0,
  "defenseIgnore": 0,
  "vulnerability": 0,
  "weaken": 0,
  "mitigation": 0,
  "targetBroken": false
}
```

未來如果加入多敵人，每個敵人可獨立擁有抗性、弱點、韌性與 debuff 狀態。

## factorSummary 輸出格式

`factorSummary` 是計算結果的一部分，用來讓 UI 顯示乘區係數與來源明細。V1 先由
`assets/js/calculator.js` 產生，UI 不應用它重新計算公式。

```json
{
  "label": "增傷區",
  "value": 2.3456,
  "formula": "100% + 增傷幅度",
  "detail": "100% + 134.56%",
  "parts": [
    { "label": "冰傷主詞條", "value": 38.88, "unit": "%" },
    { "label": "光錐增傷", "value": 60, "unit": "%" },
    { "label": "隊友增傷", "value": 50, "unit": "%" }
  ]
}
```

欄位說明：

- `label`：乘區或總值名稱。
- `value`：乘區係數，或乘區總值。
- `unit`：摘要顯示單位；攻擊區可用 `atk` 表示最終攻擊力不是 x 倍。
- `formula`：公式摘要，供人閱讀。
- `detail`：目前輸入下的代入摘要。
- `parts`：來源明細陣列。`unit` 目前可使用 `%`、`x` 或空字串；`note` 可補充條件或代入式。

目前額外輸出三個總值：

- `技能總倍率`：`Σ(技能倍率 x 目標數 x 次數)`，代表目前技能在目前敵人數與命中分布下的總倍率。
- `通用乘區倍率`：增傷區、暴擊期望、防禦區、抗性區、易傷區、我方減傷區、敵方減傷區與弱點區相乘，不含攻擊力與技能倍率。
- `不含攻擊力期望倍率`：技能總倍率 x 通用乘區倍率；期望傷害才是最終攻擊力 x 不含攻擊力期望倍率。
- `相對基準總倍率`：攻擊力倍率、增傷相對倍率、暴擊期望倍率、防禦相對倍率、抗性相對倍率、易傷相對倍率、我方減傷相對倍率、敵方減傷相對倍率與弱點相對倍率相乘。它是輔助理解用的比較值，不取代實際公式乘區。

`攻擊區` 應同時保留最終攻擊力與攻擊力倍率。攻擊力倍率定義為：

```text
攻擊力倍率 = 最終攻擊力 / 基礎攻擊力
基礎攻擊力 = 角色基礎攻擊 + 光錐基礎攻擊
```

最終攻擊力本身不是 `x` 倍乘區，UI 不能用攻擊力倍率取代最終攻擊力。

防禦區的 `value` 仍是實際公式乘區，例如可能顯示 `0.4651x`。防禦相對倍率應作為明細或相對基準總倍率的一部分：

```text
防禦相對倍率 = 目前防禦區 / 基準防禦區
```

弱點區可以納入相對基準總倍率，但不納入邊際提升參考。邊際提升參考應以目前完整配置作為 `1.0000x`，使用 `新期望傷害 / 原期望傷害 - 1` 或可直接比較時的 `新乘區 / 原乘區 - 1`。

技能總倍率的 UI 摘要以目標總覽為主要閱讀入口，`parts` 保留可讀來源摘要與各目標加總公式；完整 hit row 交給技能拆解區與 Formula Debug。目標總覽需要能展開查看每個目標倍率由哪些命中列構成，技能總倍率則等於各目標倍率總和。

## 2026-06-08 V1 資料模型補充

- `data/teams.json` 的隊伍 preset 只作初始化；主要 UI 與計算以實際隊友欄位為準。
- 隊友欄位至少包含角色、星魂、光錐、Cavern、Planar。
- 目前支援命途 / 屬性 metadata：大黑塔 = 智識 / 冰；那刻夏 = 智識 / 風；緹寶 = 同諧 / 量子；風堇 = 記憶 / 風。
- 隊友 Planar「沉陸海域露莎卡」沿用既有 `firstSlotAtkIfNotFirst` 部分支援資料，作為 1 號位攻擊加成來源。
- 晨昏交界的翔鷹與烈陽驚雷的女武神未確認能直接提升大黑塔 V1 單次傷害時，只顯示支援狀態 / TODO，不自動加乘。
- 大黑塔星魂由 `hertaEidolon` 0～6 表示；1 魂以有效解讀層數資料計算，3 / 5 魂因缺少可靠等級倍率表只展示 TODO，6 魂接入抗穿與終結技追加倍率。
- Formula Debug 模組保留，但主要 UI 不顯示。

## Mechanics 欄位建議格式

`mechanics` 用來描述角色或技能的特殊規則。能資料化的規則放 JSON；不能簡單資料化的規則由 character-specific resolver 處理。

```json
{
  "mechanics": {
    "interpretationStacks": {
      "type": "stack",
      "min": 0,
      "max": 42,
      "default": 42,
      "effects": [
        {
          "target": "hit",
          "hitTag": "interpretation-main",
          "effect": "addMultiplierPerStack",
          "value": 20,
          "condition": "twoErudition"
        }
      ]
    },
    "riddleStacks": {
      "type": "stack",
      "min": 0,
      "max": 99,
      "default": 99,
      "effects": [
        {
          "target": "skill",
          "skillId": "ultimate",
          "effect": "addMultiplierPerStack",
          "value": 1
        }
      ]
    },
    "resolver": "the-herta"
  }
}
```

建議原則：

- 優先讓 JSON 描述資料與簡單條件。
- 複雜行為集中在 resolver。
- 通用公式不應知道特定角色名稱。
- UI 只讀取可呈現的欄位，不直接實作角色規則。
