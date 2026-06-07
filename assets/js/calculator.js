export const percent = (value) => Number(value || 0) / 100;
export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
export const fmt = (value) => Math.round(value).toLocaleString("zh-TW");
export const pct = (value) => `${Number(value).toFixed(2)}%`;
export const dec = (value) => Number(value).toFixed(4);

export function calculateDamage(data, inputs, overrides = {}) {
  const state = readState(data, inputs, overrides);
  const multipliers = multiplierSet(state);
  const critMult = 1 + percent(state.critDamage);
  const expectedCritMult = 1 + percent(state.critRate) * percent(state.critDamage);
  const traceDmg = state.skill.enhanced && state.fullInterpretationTrace && state.interpretationStacks >= 42 ? 50 : 0;
  const dmgBoost = 1 + percent(state.dmgBonus + traceDmg);
  const common =
    dmgBoost *
    multipliers.defMult *
    multipliers.resMult *
    multipliers.vulnMult *
    multipliers.weakenMult *
    multipliers.mitigationMult *
    multipliers.brokenMult;

  const hits = state.skill.hits.map((hit) => {
    const targets = hit.targets === "all" ? state.enemyCount : Math.min(Number(hit.targets), state.enemyCount);
    const repeats = hit.repeats ?? 1;
    const ability = hitMultiplier(hit, state);
    const base = state.finalAtk * percent(ability) * targets * repeats;
    return {
      label: hit.label,
      ability,
      targets,
      repeats,
      base,
      normal: base * common,
      crit: base * common * critMult,
      expected: base * common * expectedCritMult,
    };
  });

  const sum = (key) => hits.reduce((total, hit) => total + hit[key], 0);
  return {
    state,
    hits,
    normal: sum("normal"),
    crit: sum("crit"),
    expected: sum("expected"),
    multipliers,
    factorSummary: buildFactorSummary(state, hits, multipliers, dmgBoost, expectedCritMult, traceDmg),
    critMult,
    expectedCritMult,
    traceDmg,
    dmgBoost,
    common,
  };
}

export function readState(data, inputs, overrides = {}) {
  const { character, lightCones, relicSets, statValues, teams } = data;
  const { baseStats, mainStatValues, rollValues } = statValues;
  const cavernSetKey = overrides.cavernSet ?? inputs.cavernSet;
  const planarSetKey = overrides.planarSet ?? inputs.planarSet;
  const cavernSet = relicSets[cavernSetKey] ?? relicSets.none;
  const planarSet = relicSets[planarSetKey] ?? relicSets.none;
  const combinedSet = combineRelicSets(cavernSet, planarSet);
  const lightConeKey = overrides.lightCone ?? inputs.lightCone;
  const lightCone = lightCones[lightConeKey] ?? lightCones.none;
  const teamKey = overrides.teamPreset ?? inputs.teamPreset;
  const team = teams[teamKey];
  const skill = character.skills.find((item) => item.id === (overrides.skillId ?? inputs.skillSelect));
  const selectedMains = {
    body: mainStatValues.bodyMainStat[overrides.bodyMainStat ?? inputs.bodyMainStat],
    feet: mainStatValues.feetMainStat[overrides.feetMainStat ?? inputs.feetMainStat],
    sphere: mainStatValues.sphereMainStat[overrides.sphereMainStat ?? inputs.sphereMainStat],
    rope: mainStatValues.ropeMainStat[overrides.ropeMainStat ?? inputs.ropeMainStat],
  };
  const mainParts = Object.values(selectedMains);
  const baseAtk = character.baseStats["80"].atk + lightCone.baseAtk;
  const flatAtkRolls = Number(overrides.flatAtkRolls ?? inputs.flatAtkRolls);
  const flatAtkFromRolls = flatAtkRolls * rollValues.flatAtkRolls;
  const flatAtk = baseStats.handFlatAtk + flatAtkFromRolls;
  const atkRolls = Number(overrides.atkRolls ?? inputs.atkRolls);
  const atkFromRolls = atkRolls * rollValues.atkRolls;
  const ultimateAtkBuff = Number(overrides.ultimateAtkBuff ?? character.ultimateAtkBuff);
  const afterUltimate = overrides.afterUltimate ?? inputs.afterUltimate;
  const twoErudition = overrides.twoErudition ?? inputs.twoErudition;
  const teamAutoBuffs = team ? teamBuffs(data, team) : emptyBuffs();
  const lightConeDmg = lightConeDmgBonus(lightCone, skill, afterUltimate);

  const atkParts = {
    main: sumPart(mainParts, "atkPercent"),
    trace: character.traceStats.atkPercent,
    team: Number(overrides.teamAtkBuff ?? inputs.teamAtkBuff) + teamAutoBuffs.atkPercent,
    relic: combinedSet.atkPercent ?? 0,
    rolls: atkFromRolls,
    ultimate: afterUltimate ? ultimateAtkBuff : 0,
  };
  const atkPercent = sumObject(atkParts);

  const critRateParts = {
    base: baseStats.critRate,
    main: sumPart(mainParts, "critRate"),
    lightCone: lightCone.critRate ?? 0,
    team: Number(overrides.teamCrBuff ?? inputs.teamCrBuff) + teamAutoBuffs.critRate,
    relic: relicCritRate(cavernSetKey, planarSetKey, combinedSet, twoErudition),
    rolls: Number(overrides.crRolls ?? inputs.crRolls) * rollValues.crRolls,
  };
  const critRateRaw = sumObject(critRateParts);

  const critDamageParts = {
    base: baseStats.critDamage,
    main: sumPart(mainParts, "critDamage"),
    lightCone: lightCone.critDamage ?? 0,
    team: Number(overrides.teamCdBuff ?? inputs.teamCdBuff) + teamAutoBuffs.critDamage,
    relic: 0,
    rolls: Number(overrides.cdRolls ?? inputs.cdRolls) * rollValues.cdRolls,
  };
  if (combinedSet.ultCritDamage && (skill.id === "ultimate" || afterUltimate)) {
    critDamageParts.relic = combinedSet.ultCritDamage;
  }
  const critDamage = sumObject(critDamageParts);

  const dmgParts = {
    main: sumPart(mainParts, "dmgBonus"),
    team: Number(overrides.teamDmgBuff ?? inputs.teamDmgBuff) + teamAutoBuffs.dmgBonus,
    trace: character.traceStats.iceDmg,
    lightCone: lightConeDmg,
    relicBase: combinedSet.dmgBonus ?? 0,
    relicSkill: skill.type === "skill" ? combinedSet.skillDmg ?? 0 : 0,
    relicUltimate: skill.type === "ultimate" ? combinedSet.ultDmg ?? 0 : 0,
    relicAfterUltimateSkill: afterUltimate && skill.type === "skill" ? combinedSet.nextSkillDmgAfterUlt ?? 0 : 0,
    relicConditional:
      (skill.type === "basic" || skill.type === "skill") && combinedSet.basicSkillDmgWhen70Cr && critRateRaw >= 70
        ? combinedSet.basicSkillDmgWhen70Cr
        : 0,
  };
  const dmgBonus = sumObject(dmgParts);
  const finalAtk = baseAtk * (1 + percent(atkPercent)) + flatAtk;

  return {
    skill,
    cavernSet,
    planarSet,
    combinedSet,
    cavernSetKey,
    planarSetKey,
    lightCone,
    team,
    teamAutoBuffs,
    selectedMains,
    baseAtk,
    characterBaseAtk: character.baseStats["80"].atk,
    lightConeBaseAtk: lightCone.baseAtk,
    handFlatAtk: baseStats.handFlatAtk,
    flatAtkFromRolls,
    flatAtk,
    atkParts,
    atkPercent,
    finalAtk,
    critRateParts,
    critRateRaw,
    critRate: clamp(critRateRaw, 0, 100),
    critDamageParts,
    critDamage,
    dmgParts,
    dmgBonus,
    resPen: Number(overrides.resPen ?? 0),
    characterLevel: Number(overrides.characterLevel ?? inputs.characterLevel),
    enemyLevel: Number(overrides.enemyLevel ?? inputs.enemyLevel),
    defReduction: Number(overrides.defReduction ?? inputs.defReduction),
    defIgnore: Number(overrides.defIgnore ?? inputs.defIgnore),
    enemyRes: Number(overrides.enemyRes ?? inputs.enemyRes),
    vulnerability: Number(overrides.vulnerability ?? inputs.vulnerability),
    weaken: Number(overrides.weaken ?? inputs.weaken),
    mitigation: Number(overrides.mitigation ?? inputs.mitigation),
    enemyCount: Number(overrides.enemyCount ?? inputs.enemyCount),
    interpretationStacks: Number(overrides.interpretationStacks ?? inputs.interpretationStacks),
    riddleStacks: Number(overrides.riddleStacks ?? inputs.riddleStacks),
    twoErudition,
    fullInterpretationTrace: overrides.fullInterpretationTrace ?? inputs.fullInterpretationTrace,
    targetBroken: overrides.targetBroken ?? inputs.targetBroken,
    character,
  };
}

function multiplierSet(state) {
  const defReductionTotal = clamp(state.defReduction + state.defIgnore, 0, 100);
  const defMult =
    (state.characterLevel + 20) /
    ((state.enemyLevel + 20) * (1 - percent(defReductionTotal)) + state.characterLevel + 20);
  const resMult = 1 - percent(state.enemyRes - state.resPen);
  const vulnMult = 1 + percent(state.vulnerability);
  const weakenMult = 1 - percent(state.weaken);
  const mitigationMult = 1 - percent(state.mitigation);
  const brokenMult = state.targetBroken ? 1 : 0.9;
  return {
    defReductionTotal,
    defMult,
    resMult,
    vulnMult,
    weakenMult,
    mitigationMult,
    brokenMult,
  };
}

function hitMultiplier(hit, state) {
  let mult = hit.multiplier;
  if (hit.interpretation) {
    const perStack = state.twoErudition ? 16 : 8;
    const adjacentPerStack = state.twoErudition ? 8 : 4;
    mult += state.interpretationStacks * (hit.interpretation === "main" ? perStack : adjacentPerStack);
  }
  if (hit.riddle) mult += state.riddleStacks;
  return mult;
}

function lightConeDmgBonus(lightCone, skill, afterUltimate) {
  let bonus = 0;
  if (lightCone.afterUltimateBuff && afterUltimate) {
    if (skill.type === "skill") bonus += lightCone.afterUltimateBuff.skillDmg ?? 0;
    if (skill.type === "ultimate") bonus += lightCone.afterUltimateBuff.ultDmg ?? 0;
  }
  if (skill.type === "skill") bonus += lightCone.skillDmg ?? 0;
  if (skill.type === "ultimate") bonus += lightCone.ultDmg ?? 0;
  return bonus;
}

function teamBuffs(data, team) {
  const buffs = emptyBuffs();
  team.members.forEach((member) => {
    const planar = data.relicSets[member.planarSet];
    if (member.slot !== 1 && planar?.firstSlotAtkIfNotFirst) {
      buffs.atkPercent += planar.firstSlotAtkIfNotFirst;
      buffs.sources.push(`${member.name} ${planar.label}: 1號位攻擊 +${planar.firstSlotAtkIfNotFirst}%`);
    }
  });
  return buffs;
}

function emptyBuffs() {
  return {
    atkPercent: 0,
    critRate: 0,
    critDamage: 0,
    dmgBonus: 0,
    vulnerability: 0,
    defReduction: 0,
    sources: [],
  };
}

function buildFactorSummary(state, hits, multipliers, dmgBoost, expectedCritMult, traceDmg) {
  const totalAbility = hits.reduce((total, hit) => total + percent(hit.ability) * hit.targets * hit.repeats, 0);
  const damageFactorTotal =
    dmgBoost *
    expectedCritMult *
    multipliers.defMult *
    multipliers.resMult *
    multipliers.vulnMult *
    multipliers.weakenMult *
    multipliers.mitigationMult *
    multipliers.brokenMult;
  const fullExpectedMultiplier = totalAbility * damageFactorTotal;
  const atkMultiplier = state.baseAtk > 0 ? state.finalAtk / state.baseAtk : 0;
  const activeDmgParts = [
    part("主詞條增傷", state.dmgParts.main, "%"),
    part("隊伍/校正增傷", state.dmgParts.team, "%"),
    part("行跡冰屬性傷害", state.dmgParts.trace, "%"),
    part(lightConeDmgLabel(state), state.dmgParts.lightCone, "%"),
    part("套裝基礎增傷", state.dmgParts.relicBase, "%"),
    part("套裝戰技增傷", state.dmgParts.relicSkill, "%"),
    part("套裝終結技增傷", state.dmgParts.relicUltimate, "%"),
    part("終結技後下次戰技增傷", state.dmgParts.relicAfterUltimateSkill, "%"),
    part("繁星競技場條件增傷", state.dmgParts.relicConditional, "%"),
    part("42 層解讀行跡增傷", traceDmg, "%"),
  ].filter(hasValue);

  return [
    {
      label: "攻擊區",
      value: atkMultiplier,
      formula: "當前攻擊力 / (角色 + 光錐基礎攻擊力)",
      detail: `${state.finalAtk.toFixed(1)} / ${state.baseAtk.toFixed(1)}`,
      parts: [
        part("角色基礎攻擊", state.characterBaseAtk),
        part("光錐基礎攻擊", state.lightConeBaseAtk),
        part("主詞條攻擊%", state.atkParts.main, "%"),
        part("行跡攻擊%", state.atkParts.trace, "%"),
        part("隊伍/校正攻擊%", state.atkParts.team, "%"),
        part("套裝攻擊%", state.atkParts.relic, "%"),
        part("副詞條攻擊%", state.atkParts.rolls, "%"),
        part("大黑塔終結技後攻擊 Buff", state.atkParts.ultimate, "%"),
        part("手部固定攻擊", state.handFlatAtk),
        part("副詞條固定攻擊", state.flatAtkFromRolls),
      ],
    },
    {
      label: "倍率區",
      value: totalAbility,
      formula: "Σ(技能倍率 x 目標數 x 次數)",
      detail: hits.map((hit) => `${hit.ability.toFixed(1)}% x ${hit.targets} x ${hit.repeats}`).join(" + "),
      parts: hits.map((hit) =>
        part(hit.label, percent(hit.ability) * hit.targets * hit.repeats, "x", `${hit.ability.toFixed(1)}% x ${hit.targets} x ${hit.repeats}`),
      ),
    },
    {
      label: "增傷區",
      value: dmgBoost,
      formula: "100% + 增傷幅度",
      detail: `100% + ${(state.dmgBonus + traceDmg).toFixed(2)}%`,
      parts: [part("基礎值", 100, "%"), ...activeDmgParts],
    },
    {
      label: "暴擊期望",
      value: expectedCritMult,
      formula: "100% + 暴率 x 暴傷",
      detail: `暴率 ${state.critRate.toFixed(2)}%，暴傷 ${state.critDamage.toFixed(2)}%`,
      parts: [
        part("基礎值", 100, "%"),
        part("計算用暴率", state.critRate, "%", `原始 ${state.critRateRaw.toFixed(2)}%，上限 100%`),
        part("總暴擊傷害", state.critDamage, "%"),
        part("暴率來源：基礎", state.critRateParts.base, "%"),
        part("暴率來源：主詞條", state.critRateParts.main, "%"),
        part("暴率來源：光錐", state.critRateParts.lightCone, "%"),
        part("暴率來源：隊伍/校正", state.critRateParts.team, "%"),
        part("暴率來源：套裝", state.critRateParts.relic, "%"),
        part("暴率來源：副詞條", state.critRateParts.rolls, "%"),
        part("暴傷來源：基礎", state.critDamageParts.base, "%"),
        part("暴傷來源：主詞條", state.critDamageParts.main, "%"),
        part("暴傷來源：光錐", state.critDamageParts.lightCone, "%"),
        part("暴傷來源：隊伍/校正", state.critDamageParts.team, "%"),
        part("暴傷來源：套裝", state.critDamageParts.relic, "%"),
        part("暴傷來源：副詞條", state.critDamageParts.rolls, "%"),
      ],
    },
    {
      label: "防禦區",
      value: multipliers.defMult,
      formula: "(角色等級 + 20) / ((敵人等級 + 20) x (1 - 減防/無視) + 角色等級 + 20)",
      detail: `目前減防/無視 ${multipliers.defReductionTotal.toFixed(2)}%`,
      parts: [
        part("角色等級", state.characterLevel),
        part("敵人等級", state.enemyLevel),
        part("防禦降低", state.defReduction, "%"),
        part("防禦無視", state.defIgnore, "%"),
        part("合計減防/無視", multipliers.defReductionTotal, "%"),
      ],
    },
    {
      label: "抗性區",
      value: multipliers.resMult,
      formula: "100% - (抗性 - 抗穿)",
      detail: `${state.enemyRes.toFixed(2)}% - ${state.resPen.toFixed(2)}%`,
      parts: [part("敵人冰抗性", state.enemyRes, "%"), part("抗性穿透", state.resPen, "%")],
    },
    {
      label: "易傷區",
      value: multipliers.vulnMult,
      formula: "100% + 易傷",
      detail: `${state.vulnerability.toFixed(2)}%`,
      parts: [part("基礎值", 100, "%"), part("敵人易傷", state.vulnerability, "%")],
    },
    {
      label: "我方減傷區",
      value: multipliers.weakenMult,
      formula: "100% - 我方傷害降低",
      detail: `${state.weaken.toFixed(2)}%`,
      parts: [part("基礎值", 100, "%"), part("我方傷害降低", state.weaken, "%")],
    },
    {
      label: "敵方減傷區",
      value: multipliers.mitigationMult,
      formula: "100% - 敵方減傷",
      detail: `${state.mitigation.toFixed(2)}%`,
      parts: [part("基礎值", 100, "%"), part("敵方減傷", state.mitigation, "%")],
    },
    {
      label: "弱點區",
      value: multipliers.brokenMult,
      formula: "已擊破 1 / 未擊破 0.9",
      detail: state.targetBroken ? "敵人已弱點擊破" : "敵人未弱點擊破",
      parts: [part("弱點擊破狀態", multipliers.brokenMult, "x", state.targetBroken ? "已擊破" : "未擊破")],
    },
    {
      label: "傷害乘區總值",
      value: damageFactorTotal,
      formula: "增傷區 x 暴擊期望 x 防禦區 x 抗性區 x 易傷區 x 我方減傷區 x 敵方減傷區 x 弱點區",
      detail: "不含攻擊與技能倍率",
      parts: [
        part("增傷區", dmgBoost, "x"),
        part("暴擊期望", expectedCritMult, "x"),
        part("防禦區", multipliers.defMult, "x"),
        part("抗性區", multipliers.resMult, "x"),
        part("易傷區", multipliers.vulnMult, "x"),
        part("我方減傷區", multipliers.weakenMult, "x"),
        part("敵方減傷區", multipliers.mitigationMult, "x"),
        part("弱點區", multipliers.brokenMult, "x"),
      ],
    },
    {
      label: "完整期望倍率",
      value: fullExpectedMultiplier,
      formula: "倍率區 x 增傷區 x 暴擊期望 x 防禦區 x 抗性區 x 易傷區 x 我方減傷區 x 敵方減傷區 x 弱點區",
      detail: "不含攻擊力；多段技能使用目前結果的技能倍率區總和",
      parts: [
        part("倍率區", totalAbility, "x"),
        part("傷害乘區總值", damageFactorTotal, "x"),
      ],
    },
  ];
}

function part(label, value, unit = "", note = "") {
  return { label, value: Number(value || 0), unit, note };
}

function hasValue(item) {
  return Math.abs(item.value) > 0;
}

function lightConeDmgLabel(state) {
  if (!state.dmgParts.lightCone) return "光錐增傷";
  if (state.lightCone.afterUltimateBuff && state.atkParts.ultimate && state.lightCone.label) {
    return `光錐增傷（${state.lightCone.label}，終結技後）`;
  }
  return `光錐增傷（${state.lightCone.label}）`;
}

function combineRelicSets(...sets) {
  return sets.reduce((combined, set) => {
    Object.entries(set ?? {}).forEach(([key, value]) => {
      if (typeof value === "number") {
        combined[key] = (combined[key] ?? 0) + value;
      }
    });
    return combined;
  }, {});
}

function relicCritRate(cavernSetKey, planarSetKey, combinedSet, twoErudition) {
  let critRate = combinedSet.critRate ?? 0;
  if (planarSetKey === "izumo" && !twoErudition) {
    critRate -= 12;
  }
  return critRate;
}

function sumPart(parts, key) {
  return parts.reduce((total, part) => total + (part?.[key] ?? 0), 0);
}

function sumObject(object) {
  return Object.values(object).reduce((total, value) => total + Number(value || 0), 0);
}
