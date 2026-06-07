---
name: hsr-damage-calc
description: Honkai: Star Rail damage calculator project guidance. Use when working on HSR damage formulas, character data, relic/light-cone/team buff modeling, The Herta calculations, or the hsr-damage-lab repository. Covers source verification, formula checkpoints, UI/data consistency, and documentation updates.
---

# HSR Damage Calc

Use this skill for `hsr-damage-lab` and related Honkai: Star Rail damage-calculation work.

## Project Anchors

Default repo path:

```text
D:\User\Documents\Alex\Code\hsr-damage-lab
```

Published site:

```text
https://alex9810171.github.io/hsr-damage-lab/
```

Important files:

```text
index.html
assets/css/styles.css
assets/js/*.js
data/*.json
data/characters/*.json
README.md
docs/project-notes.md
docs/roadmap.md
```

## Source Policy

- Browse and verify current HSR character, relic, light cone, or rules data before changing formulas or game data.
- Prefer current database pages when available. The user has used:
  - `https://hsr.nanoka.cc/character/1401/`
  - `https://hsr.nanoka.cc/character`
- Cross-check set effects with another source when possible.
- Mention uncertainty when a value depends on trace level, eidolon, superimposition, or game version.

## Formula Checklist

```text
Single-hit base damage = final scaling stat x skill multiplier x target count x repeat count
Non-crit damage = base damage x DMG bonus x DEF multiplier x RES multiplier x vulnerability x damage reduction x weakness-break state
Crit damage = non-crit damage x (1 + crit damage)
Expected damage = non-crit damage x (1 + min(crit rate, 100%) x crit damage)
```

DEF multiplier:

```text
(character level + 20) / ((enemy level + 20) x (1 - DEF reduction/ignore) + character level + 20)
```

RES multiplier:

```text
1 - (enemy RES - special RES PEN)
```

Do not expose player-facing RES PEN as normal equipment unless a character/eidolon/light cone grants it.

## The Herta Checklist

- Trace stat bonuses: ATK +18%, SPD +5, Ice DMG +22.4%.
- Ultimate grants ATK buff from character data; do not expose this as a normal player-editable equipment field.
- Enhanced Skill: if main target Interpretation reaches 42, The Herta DMG +50% for this attack.
- Riddle: each Interpretation stack applied grants 1 Riddle, max 99. Ultimate multiplier +1% per Riddle stack. Default test value can be 99.
- Team condition: 2+ Erudition characters changes Interpretation scaling and may activate same-path planar conditions.

## Relic Checklist

Do not omit 2-piece effects.
Model cavern relics and planar ornaments as separate slots; both can trigger at the same time and must be combined in calculation.

- Scholar Lost in Erudition: CRIT Rate +8%; Skill/Ultimate DMG +20%; after Ultimate, next Skill DMG +25%.
- Hunter of Glacial Forest: Ice DMG +10%; after Ultimate, CRIT DMG +25%.
- Izumo Gensei and Takama Divine Realm: ATK +12%; with same Path ally, CRIT Rate +12%.
- Rutilant Arena: CRIT Rate +8%; at 70%+ CRIT Rate, Basic/Skill DMG +20%.
- Lushaka: Energy Regen +5%; if wearer is not first party slot, first slot ally ATK +12%.
- Vonwacq: Energy Regen +5%; action advance at speed threshold, normally not direct damage.
- Eagle/Wind set: Wind DMG +10%; action advance after Ultimate, normally not direct The Herta damage.

## UI/Data Modeling

- Prefer source-based inputs over final stat manual entry.
- Character select should show character names only; level is separate.
- Equipment should model character, light cone, relic main stats, set effects, and substat counts.
- Team should model teammate + eidolon + signature light cone + relic effects. Manual buff correction fields are acceptable as a bridge.
- Formula Debug should show every source and multiplier used, especially conditional effects.

## Change Workflow

1. Verify source data.
2. Update `data/*.json` first.
3. Update calculator logic only after data shape is clear.
4. Update UI labels/inputs.
5. Update Formula Debug.
6. Update docs when scope or limitations change.
7. Run `git diff`, `git status`, commit, and push when the user wants the site updated.
