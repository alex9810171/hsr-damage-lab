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
  const relicKey = overrides.relicSet ?? inputs.relicSet;
  const set = relicSets[relicKey] ?? relicSets.none;
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
  const ultimateAtkBuff = Number(overrides.ultimateAtkBuff ?? inputs.ultimateAtkBuff);
  const afterUltimate = overrides.afterUltimate ?? inputs.afterUltimate;
  const twoErudition = overrides.twoErudition ?? inputs.twoErudition;
  const teamAutoBuffs = team ? teamBuffs(data, team) : emptyBuffs();

  const atkParts = {
    main: sumPart(mainParts, "atkPercent"),
    trace: character.traceStats.atkPercent,
    team: Number(overrides.teamAtkBuff ?? inputs.teamAtkBuff) + teamAutoBuffs.atkPercent,
    relic: set.atkPercent ?? 0,
    rolls: atkFromRolls,
    ultimate: afterUltimate ? ultimateAtkBuff : 0,
  };
  const atkPercent = sumObject(atkParts);

  const critRateParts = {
    base: baseStats.critRate,
    main: sumPart(mainParts, "critRate"),
    team: Number(overrides.teamCrBuff ?? inputs.teamCrBuff) + teamAutoBuffs.critRate,
    relic: relicKey === "izumo" ? (twoErudition ? set.critRate ?? 0 : 0) : set.critRate ?? 0,
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
  if (set.ultCritDamage && (skill.id === "ultimate" || afterUltimate)) {
    critDamageParts.relic = set.ultCritDamage;
  }
  const critDamage = sumObject(critDamageParts);

  const dmgParts = {
    main: sumPart(mainParts, "dmgBonus"),
    team: Number(overrides.teamDmgBuff ?? inputs.teamDmgBuff) + teamAutoBuffs.dmgBonus,
    trace: character.traceStats.iceDmg,
    relicBase: set.dmgBonus ?? 0,
    relicSkill: skill.type === "skill" ? set.skillDmg ?? 0 : 0,
    relicUltimate: skill.type === "ultimate" ? set.ultDmg ?? 0 : 0,
    relicAfterUltimateSkill: afterUltimate && skill.type === "skill" ? set.nextSkillDmgAfterUlt ?? 0 : 0,
    relicConditional:
      (skill.type === "basic" || skill.type === "skill") && set.basicSkillDmgWhen70Cr && critRateRaw >= 70
        ? set.basicSkillDmgWhen70Cr
        : 0,
  };
  const dmgBonus = sumObject(dmgParts);
  const finalAtk = baseAtk * (1 + percent(atkPercent)) + flatAtk;

  return {
    skill,
    set,
    relicKey,
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

function sumPart(parts, key) {
  return parts.reduce((total, part) => total + (part?.[key] ?? 0), 0);
}

function sumObject(object) {
  return Object.values(object).reduce((total, value) => total + Number(value || 0), 0);
}
