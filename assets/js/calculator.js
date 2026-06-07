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
    factorSummary: buildFactorSummary(state, hits, multipliers, dmgBoost, expectedCritMult),
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
    team: Number(overrides.teamCrBuff ?? inputs.teamCrBuff) + teamAutoBuffs.critRate,
    relic: relicCritRate(cavernSetKey, planarSetKey, combinedSet, twoErudition),
    rolls: Number(overrides.crRolls ?? inputs.crRolls) * rollValues.crRolls,
  };
  const critRateRaw = sumObject(critRateParts);

  const critDamageParts = {
    base: baseStats.critDamage,
    main: sumPart(mainParts, "critDamage"),
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
    const perStack = state.twoErudition ? 20 : 10;
    const adjacentPerStack = state.twoErudition ? 10 : 5;
    mult += state.interpretationStacks * (hit.interpretation === "main" ? perStack : adjacentPerStack);
  }
  if (hit.riddle) mult += state.riddleStacks;
  if (state.skill.id === "ultimate") {
    if (state.enemyCount >= 3) mult += 140;
    if (state.enemyCount === 2) mult += 250;
    if (state.enemyCount === 1) mult += 400;
  }
  return mult;
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

function buildFactorSummary(state, hits, multipliers, dmgBoost, expectedCritMult) {
  const totalAbility = hits.reduce((total, hit) => total + percent(hit.ability) * hit.targets * hit.repeats, 0);
  return [
    {
      label: "攻擊區",
      value: state.baseAtk > 0 ? state.finalAtk / state.baseAtk : 0,
      formula: "當前攻擊力 / (角色 + 光錐基礎攻擊力)",
      detail: `${state.finalAtk.toFixed(1)} / ${state.baseAtk.toFixed(1)}`,
    },
    {
      label: "倍率區",
      value: totalAbility,
      formula: "Σ(技能倍率 x 目標數 x 次數)",
      detail: hits.map((hit) => `${hit.ability.toFixed(1)}% x ${hit.targets} x ${hit.repeats}`).join(" + "),
    },
    {
      label: "增傷區",
      value: dmgBoost,
      formula: "100% + 增傷幅度",
      detail: `100% + ${(state.dmgBonus + (state.skill.enhanced && state.fullInterpretationTrace && state.interpretationStacks >= 42 ? 50 : 0)).toFixed(2)}%`,
    },
    {
      label: "暴擊期望",
      value: expectedCritMult,
      formula: "100% + 暴率 x 暴傷",
      detail: `暴率 ${state.critRate.toFixed(2)}%，暴傷 ${state.critDamage.toFixed(2)}%`,
    },
    {
      label: "防禦區",
      value: multipliers.defMult,
      formula: "防禦乘區",
      detail: `目前減防/無視 ${multipliers.defReductionTotal.toFixed(2)}%`,
    },
    { label: "抗性區", value: multipliers.resMult, formula: "100% - (抗性 - 抗穿)", detail: "" },
    { label: "易傷區", value: multipliers.vulnMult, formula: "100% + 易傷", detail: "" },
    { label: "我方減傷區", value: multipliers.weakenMult, formula: "100% - 我方傷害降低", detail: "" },
    { label: "敵方減傷區", value: multipliers.mitigationMult, formula: "100% - 敵方減傷", detail: "" },
    { label: "弱點區", value: multipliers.brokenMult, formula: "擊破 1 / 未擊破 0.9", detail: "" },
  ];
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
