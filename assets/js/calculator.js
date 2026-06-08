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

  const hits = resolveSkillHits(state).map((hit) => {
    const targets = hit.targets;
    const repeats = hit.repeats;
    const ability = hit.ability;
    const base = state.finalAtk * percent(ability) * targets * repeats;
    return {
      label: hit.label,
      rowLabel: hit.rowLabel,
      position: hit.position,
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
    targetDistribution: buildTargetDistribution(hits),
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
  const presetTeam = teams[teamKey];
  const activeTeamMembers = activeTeamFromInputs(inputs, overrides, presetTeam);
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
  const teamAutoBuffs = teamBuffs(data, activeTeamMembers);
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
    team: presetTeam,
    teamKey,
    activeTeamMembers,
    teamLabel: teamKey === "custom" ? "自訂隊伍" : (presetTeam?.label ?? "自訂隊伍"),
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
    hertaE1: overrides.hertaE1 ?? inputs.hertaE1,
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

function baselineMultiplierSet(state) {
  const baseDefMult =
    (state.characterLevel + 20) / ((state.enemyLevel + 20) + state.characterLevel + 20);
  return {
    defMult: baseDefMult,
    resMult: 1 - percent(state.enemyRes),
    vulnMult: 1,
    weakenMult: 1,
    mitigationMult: 1,
    brokenMult: 0.9,
  };
}

function resolveSkillHits(state) {
  return state.skill.hits.flatMap((hit) => {
    const positions = targetPositionsForHit(hit, state.enemyCount);
    return positions.map((position) => {
      const ability = hitMultiplier(hit, state, position);
      return {
        label: `${hit.label}${positions.length > 1 ? `（${targetLabel(position)}）` : ""}`,
        rowLabel: hit.label,
        position,
        ability,
        targets: 1,
        repeats: hit.repeats ?? 1,
      };
    });
  });
}

function targetPositionsForHit(hit, enemyCount) {
  if (hit.targetPattern) {
    const positions = activeTargetPositions(enemyCount);
    if (hit.targetPattern === "all") return positions;
    if (hit.targetPattern === "center") return positions.includes(0) ? [0] : positions.slice(0, 1);
    if (hit.targetPattern === "adjacent") return positions.filter((position) => Math.abs(position) <= 1);
  }
  const targets = hit.targets === "all" ? enemyCount : Math.min(Number(hit.targets ?? 1), enemyCount);
  return activeTargetPositions(enemyCount).slice(0, targets);
}

function activeTargetPositions(enemyCount) {
  const count = Math.trunc(clamp(Number(enemyCount || 1), 1, 5));
  if (count === 1) return [0];
  if (count === 2) return [0, 1];
  if (count === 3) return [-1, 0, 1];
  if (count === 4) return [-1, 0, 1, 2];
  return [-2, -1, 0, 1, 2];
}

function targetLabel(position) {
  if (position === 0) return "主目標";
  if (position === -1) return "左一";
  if (position === -2) return "左二";
  if (position === 1) return "右一";
  if (position === 2) return "右二";
  return `目標 ${position}`;
}

function hitMultiplier(hit, state, position = 0) {
  let mult = hit.multiplier;
  if (hit.mechanicRow === "interpretation") {
    const perStack = state.twoErudition ? 16 : 8;
    const adjacentPerStack = state.twoErudition ? 8 : 4;
    const eidolonMultiplier = state.hertaE1 ? 1.5 : 1;
    mult += state.interpretationStacks * (position === 0 ? perStack : adjacentPerStack) * eidolonMultiplier;
  } else if (hit.interpretation) {
    const perStack = state.twoErudition ? 16 : 8;
    const adjacentPerStack = state.twoErudition ? 8 : 4;
    const eidolonMultiplier = state.hertaE1 ? 1.5 : 1;
    mult += state.interpretationStacks * (hit.interpretation === "main" ? perStack : adjacentPerStack) * eidolonMultiplier;
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

function activeTeamFromInputs(inputs, overrides, presetTeam) {
  const fallbackMembers = presetTeam?.members?.slice(1) ?? [];
  return [1, 2, 3].map((slot) => {
    const fallback = fallbackMembers[slot - 1] ?? {};
    const id = overrides[`teammate${slot}`] ?? inputs[`teammate${slot}`] ?? fallback.id ?? "none";
    const setup = overrides[`teammate${slot}Setup`] ?? inputs[`teammate${slot}Setup`] ?? memberSetup(fallback);
    return {
      slot: slot + 1,
      id,
      name: teammateName(id, fallback.name),
      eidolon: Number(overrides[`teammate${slot}Eidolon`] ?? inputs[`teammate${slot}Eidolon`] ?? fallback.eidolon ?? 0),
      setup,
      planarSet: teammatePlanarSet(id, setup, fallback.planarSet),
    };
  });
}

function memberSetup(member = {}) {
  if (member.signatureSuperimposition > 0 && member.planarSet !== "none") return "signatureRelic";
  if (member.signatureSuperimposition > 0) return "signature";
  if (member.planarSet && member.planarSet !== "none") return "relic";
  return "none";
}

function teammateName(id, fallbackName) {
  const names = {
    none: "未選擇",
    custom: "自訂隊友",
    anaxa: "那刻夏",
    tribbie: "緹寶",
    hyacine: "風堇",
    jade: "翡翠",
    smallHerta: "黑塔",
    robin: "知更鳥",
    ruanMei: "阮・梅",
    pela: "佩拉",
  };
  return names[id] ?? fallbackName ?? id;
}

function teammatePlanarSet(id, setup, fallbackPlanarSet) {
  if (setup !== "relic" && setup !== "signatureRelic") return "none";
  if (fallbackPlanarSet && fallbackPlanarSet !== "none") return fallbackPlanarSet;
  if (id === "anaxa" || id === "tribbie") return "lushaka";
  return "none";
}

function teamBuffs(data, members) {
  const buffs = emptyBuffs();
  members.forEach((member) => {
    const planar = data.relicSets[member.planarSet];
    if (member.slot !== 1 && planar?.firstSlotAtkIfNotFirst) {
      buffs.atkPercent += planar.firstSlotAtkIfNotFirst;
      buffs.sources.push(`${member.name} ${planar.label}: 1號位攻擊 +${planar.firstSlotAtkIfNotFirst}%`);
    }
  });
  return buffs;
}

function buildTargetDistribution(hits) {
  const labels = new Map();
  const totals = new Map();
  const parts = new Map();
  hits.forEach((hit) => {
    if (hit.position === undefined) return;
    labels.set(hit.position, targetLabel(hit.position));
    const value = hit.ability * hit.targets * hit.repeats;
    totals.set(hit.position, (totals.get(hit.position) ?? 0) + value);
    const currentParts = parts.get(hit.position) ?? [];
    currentParts.push({
      label: hit.rowLabel,
      multiplier: value,
    });
    parts.set(hit.position, currentParts);
  });
  return [...totals.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([position, multiplier]) => ({ position, label: labels.get(position), multiplier, parts: parts.get(position) ?? [] }));
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
  const commonExpectedMultiplier =
    dmgBoost *
    expectedCritMult *
    multipliers.defMult *
    multipliers.resMult *
    multipliers.vulnMult *
    multipliers.weakenMult *
    multipliers.mitigationMult *
    multipliers.brokenMult;
  const expectedMultiplierWithoutAtk = totalAbility * commonExpectedMultiplier;
  const targetDistribution = buildTargetDistribution(hits);
  const baselineMultipliers = baselineMultiplierSet(state);
  const atkMultiplier = state.baseAtk > 0 ? state.finalAtk / state.baseAtk : 0;
  const relativeMultipliers = {
    atk: atkMultiplier,
    dmgBoost: dmgBoost / 1,
    expectedCrit: expectedCritMult,
    defense: baselineMultipliers.defMult ? multipliers.defMult / baselineMultipliers.defMult : 0,
    resistance: baselineMultipliers.resMult ? multipliers.resMult / baselineMultipliers.resMult : 0,
    vulnerability: multipliers.vulnMult / baselineMultipliers.vulnMult,
    weaken: baselineMultipliers.weakenMult ? multipliers.weakenMult / baselineMultipliers.weakenMult : 0,
    mitigation: baselineMultipliers.mitigationMult ? multipliers.mitigationMult / baselineMultipliers.mitigationMult : 0,
    broken: baselineMultipliers.brokenMult ? multipliers.brokenMult / baselineMultipliers.brokenMult : 0,
  };
  const relativeBaselineTotal = Object.values(relativeMultipliers).reduce((total, value) => total * value, 1);
  const defensePlusTen = defenseMultiplierFor(state, state.defReduction + 10, state.defIgnore);
  const defensePlusTenGain = multipliers.defMult > 0 ? defensePlusTen / multipliers.defMult - 1 : 0;
  const targetParts = targetDistribution.map((item) =>
    part(`目標總覽：${item.label}`, percent(item.multiplier), "x", `${item.multiplier.toFixed(0)}%`),
  );
  const targetFormula = targetDistribution.map((item) => `${item.multiplier.toFixed(0)}%`).join(" + ");
  const baseHitParts = summarizeHitRows(hits.filter((hit) => hit.rowLabel !== "解讀層數倍率")).map((item) =>
    part(`基礎命中：${item.label}`, item.value, "x", item.note),
  );
  const interpretationParts = hits
    .filter((hit) => hit.rowLabel === "解讀層數倍率")
    .map((hit) => part(`解讀層數：${targetLabel(hit.position)}`, percent(hit.ability) * hit.repeats, "x", `${hit.ability.toFixed(1)}% x ${hit.repeats}`));
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
      value: state.finalAtk,
      unit: "atk",
      formula: "最終攻擊力",
      detail: "攻擊力是基礎數值，不以 x 倍顯示",
      parts: [
        part("角色基礎攻擊", state.characterBaseAtk),
        part("光錐基礎攻擊", state.lightConeBaseAtk),
        part("基礎攻擊力", state.baseAtk, "", `${state.characterBaseAtk.toFixed(1)} + ${state.lightConeBaseAtk.toFixed(1)}`),
        part("主詞條攻擊%", state.atkParts.main, "%"),
        part("行跡攻擊%", state.atkParts.trace, "%"),
        part("隊伍/校正攻擊%", state.atkParts.team, "%"),
        part("套裝攻擊%", state.atkParts.relic, "%"),
        part("副詞條攻擊%", state.atkParts.rolls, "%"),
        part("大黑塔終結技後攻擊 Buff", state.atkParts.ultimate, "%"),
        part("手部固定攻擊", state.handFlatAtk),
        part("副詞條固定攻擊", state.flatAtkFromRolls),
        part("固定攻擊合計", state.flatAtk),
        part("最終攻擊力", state.finalAtk, "", `${state.baseAtk.toFixed(1)} x (1 + ${state.atkPercent.toFixed(2)}%) + ${state.flatAtk.toFixed(1)}`),
        part("攻擊力倍率", atkMultiplier, "x", "最終攻擊力 / 基礎攻擊力"),
      ],
    },
    {
      label: "技能總倍率",
      value: totalAbility,
      unit: "x",
      formula: "總倍率 = 各目標倍率總和",
      detail: `${targetFormula} = ${(totalAbility * 100).toFixed(0)}% = ${totalAbility.toFixed(4)}x`,
      parts: [
        ...targetParts,
        part("技能總倍率公式", totalAbility, "x", `${targetFormula} = ${(totalAbility * 100).toFixed(0)}%`),
        ...baseHitParts,
        ...interpretationParts,
      ],
    },
    {
      label: "相對基準總倍率",
      value: relativeBaselineTotal,
      unit: "x",
      formula:
        "攻擊力倍率 x 增傷相對倍率 x 暴擊期望倍率 x 防禦相對倍率 x 抗性相對倍率 x 易傷相對倍率 x 我方減傷相對倍率 x 敵方減傷相對倍率 x 弱點相對倍率",
      detail: "以基準狀態作為 1.0000x 的比較值，不是遊戲公式中的原始乘區。",
      parts: [
        part("攻擊力倍率", relativeMultipliers.atk, "x", "最終攻擊力 / 基礎攻擊力"),
        part("增傷相對倍率", relativeMultipliers.dmgBoost, "x", "目前增傷區 / 基準增傷區 1.0000"),
        part("暴擊期望倍率", relativeMultipliers.expectedCrit, "x", "1 + 暴率 x 暴傷，暴率沿用上限處理"),
        part("防禦相對倍率", relativeMultipliers.defense, "x", `目前 ${multipliers.defMult.toFixed(4)} / 基準 ${baselineMultipliers.defMult.toFixed(4)}`),
        part("抗性相對倍率", relativeMultipliers.resistance, "x", `目前 ${multipliers.resMult.toFixed(4)} / 基準 ${baselineMultipliers.resMult.toFixed(4)}`),
        part("易傷相對倍率", relativeMultipliers.vulnerability, "x", "目前易傷區 / 基準 1.0000"),
        part("我方減傷相對倍率", relativeMultipliers.weaken, "x", "目前我方減傷區 / 基準 1.0000"),
        part("敵方減傷相對倍率", relativeMultipliers.mitigation, "x", "目前敵方減傷區 / 基準 1.0000"),
        part("弱點相對倍率", relativeMultipliers.broken, "x", `目前 ${multipliers.brokenMult.toFixed(4)} / 基準 ${baselineMultipliers.brokenMult.toFixed(4)}`),
      ],
    },
    {
      label: "增傷區",
      value: dmgBoost,
      unit: "x",
      formula: "100% + 增傷幅度",
      detail: `100% + ${(state.dmgBonus + traceDmg).toFixed(2)}%`,
      parts: [part("基礎值", 100, "%"), ...activeDmgParts],
    },
    {
      label: "暴擊期望",
      value: expectedCritMult,
      unit: "x",
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
      unit: "x",
      formula: "(角色等級 + 20) / ((敵人等級 + 20) x (1 - 減防/無視) + 角色等級 + 20)",
      detail: `目前減防/無視 ${multipliers.defReductionTotal.toFixed(2)}%`,
      parts: [
        part("實際防禦乘區", multipliers.defMult, "x", "此值直接進入傷害公式"),
        part("基準防禦乘區", baselineMultipliers.defMult, "x", "同角色/敵人等級，無額外防禦降低與防禦無視"),
        part("防禦相對倍率", relativeMultipliers.defense, "x", "目前防禦區 / 基準防禦區"),
        part("目前配置作為邊際提升基準", 1, "x", "邊際提升參考以目前完整配置為 1.0000x"),
        part("防禦降低 +10% 相對提升", defensePlusTenGain * 100, "%", `${defensePlusTen.toFixed(4)} / ${multipliers.defMult.toFixed(4)} - 1`),
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
      unit: "x",
      formula: "100% - (抗性 - 抗穿)",
      detail: `${state.enemyRes.toFixed(2)}% - ${state.resPen.toFixed(2)}%`,
      parts: [part("敵人冰抗性", state.enemyRes, "%"), part("抗性穿透", state.resPen, "%")],
    },
    {
      label: "易傷區",
      value: multipliers.vulnMult,
      unit: "x",
      formula: "100% + 易傷",
      detail: `${state.vulnerability.toFixed(2)}%`,
      parts: [part("基礎值", 100, "%"), part("敵人易傷", state.vulnerability, "%")],
    },
    {
      label: "我方減傷區",
      value: multipliers.weakenMult,
      unit: "x",
      formula: "100% - 我方傷害降低",
      detail: `${state.weaken.toFixed(2)}%`,
      parts: [part("基礎值", 100, "%"), part("我方傷害降低", state.weaken, "%")],
    },
    {
      label: "敵方減傷區",
      value: multipliers.mitigationMult,
      unit: "x",
      formula: "100% - 敵方減傷",
      detail: `${state.mitigation.toFixed(2)}%`,
      parts: [part("基礎值", 100, "%"), part("敵方減傷", state.mitigation, "%")],
    },
    {
      label: "弱點區",
      value: multipliers.brokenMult,
      unit: "x",
      formula: "已擊破 1 / 未擊破 0.9",
      detail: state.targetBroken ? "敵人已弱點擊破" : "敵人未弱點擊破",
      parts: [
        part("實際弱點乘區", multipliers.brokenMult, "x", "此值直接進入傷害公式"),
        part("弱點相對倍率", relativeMultipliers.broken, "x", `目前 ${multipliers.brokenMult.toFixed(4)} / 基準 ${baselineMultipliers.brokenMult.toFixed(4)}`),
        part("弱點擊破狀態", multipliers.brokenMult, "x", state.targetBroken ? "已擊破" : "未擊破"),
        part("說明", 0, "note", "弱點區屬於戰鬥狀態乘區，保留於實際公式中，也可納入相對基準總倍率；但不列入邊際提升參考。"),
      ],
    },
    {
      label: "通用乘區倍率",
      value: commonExpectedMultiplier,
      unit: "x",
      formula: "增傷區 x 暴擊期望 x 防禦區 x 抗性區 x 易傷區 x 我方減傷區 x 敵方減傷區 x 弱點區",
      detail: "不含攻擊力與技能倍率",
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
      label: "不含攻擊力期望倍率",
      value: expectedMultiplierWithoutAtk,
      unit: "x",
      formula: "技能總倍率 x 通用乘區倍率",
      detail: "期望傷害 = 最終攻擊力 x 不含攻擊力期望倍率",
      parts: [
        part("技能總倍率", totalAbility, "x"),
        part("通用乘區倍率", commonExpectedMultiplier, "x"),
      ],
    },
  ];
}

function defenseMultiplierFor(state, defReduction, defIgnore) {
  const defReductionTotal = clamp(Number(defReduction || 0) + Number(defIgnore || 0), 0, 100);
  return (
    (state.characterLevel + 20) /
    ((state.enemyLevel + 20) * (1 - percent(defReductionTotal)) + state.characterLevel + 20)
  );
}

function summarizeHitRows(hits) {
  const rows = new Map();
  hits.forEach((hit) => {
    const current = rows.get(hit.rowLabel) ?? {
      label: hit.rowLabel,
      value: 0,
      ability: hit.ability,
      targets: 0,
      repeats: hit.repeats,
    };
    current.value += percent(hit.ability) * hit.targets * hit.repeats;
    current.targets += hit.targets;
    rows.set(hit.rowLabel, current);
  });
  return [...rows.values()].map((row) => ({
    ...row,
    note: `${row.ability.toFixed(1)}% x 目標 ${row.targets} x 次數 ${row.repeats}`,
  }));
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
