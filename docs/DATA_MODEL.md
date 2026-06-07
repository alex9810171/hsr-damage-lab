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
- `repeats`：同一段 hit 重複次數。
- `tags`：供 Buff 條件判斷。
- `mechanics`：只放可資料化的技能特殊規則。

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
        }
      ]
    }
  },
  "conditions": []
}
```

光錐可先資料化基礎攻擊與固定 Buff；複雜條件可交給 resolver。

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
