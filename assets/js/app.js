const character = {
  id: "1401",
  name: "大黑塔",
  element: "冰",
  ultimateAtkBuff: 80,
  traceIceDmg: 22.4,
  skills: [
    {
      id: "basic",
      name: "普攻：開竅了嗎",
      type: "普攻",
      hits: [{ label: "指定單體", multiplier: 140, targets: 1 }],
    },
    {
      id: "skill",
      name: "戰技：格局打開",
      type: "戰技",
      hits: [
        { label: "主目標", multiplier: 88, targets: 1 },
        { label: "主目標及相鄰目標，重複 2 次", multiplier: 88, targets: 3, repeats: 2 },
      ],
    },
    {
      id: "enhanced",
      name: "強化戰技：我有一個大膽的想法",
      type: "戰技",
      enhanced: true,
      hits: [
        { label: "主目標", multiplier: 100, targets: 1, interpretation: "main" },
        { label: "主目標及相鄰目標，重複 2 次", multiplier: 100, targets: 3, repeats: 2, interpretation: "adjacent" },
        { label: "敵方全體收尾", multiplier: 50, targets: "all" },
      ],
    },
    {
      id: "ultimate",
      name: "終結技：早說了是魔法吧",
      type: "終結技",
      hits: [{ label: "敵方全體", multiplier: 250, targets: "all", riddle: true }],
    },
  ],
};

const relicSets = {
  none: { label: "不套用" },
  scholar: { label: "識海迷墜的學者", skillDmg: 20, ultDmg: 20 },
  ice: { label: "密林臥雪的獵人", dmgBonus: 10, ultCritDamage: 25 },
  izumo: { label: "出雲顯世與高天神國", atkPercent: 12, critRate: 12 },
  rutilant: { label: "繁星競技場", basicSkillDmgWhen70Cr: 20 },
};

const lightCones = {
  signature: { label: "向著不可追問處", baseAtk: 635 },
  genius: { label: "拂曉之前", baseAtk: 582 },
  cosmos: { label: "銀河鐵道之夜", baseAtk: 582 },
  none: { label: "不計光錐", baseAtk: 0 },
};

const mainStatValues = {
  bodyMainStat: {
    critDamage: { label: "暴擊傷害", critDamage: 64.8 },
    critRate: { label: "暴擊率", critRate: 32.4 },
    atkPercent: { label: "攻擊力", atkPercent: 43.2 },
  },
  feetMainStat: {
    atkPercent: { label: "攻擊力", atkPercent: 43.2 },
    speed: { label: "速度" },
  },
  sphereMainStat: {
    iceDmg: { label: "冰屬性傷害", dmgBonus: 38.88 },
    atkPercent: { label: "攻擊力", atkPercent: 43.2 },
  },
  ropeMainStat: {
    atkPercent: { label: "攻擊力", atkPercent: 43.2 },
    energyRegen: { label: "能量恢復效率" },
    breakEffect: { label: "擊破特攻" },
  },
};

const baseStats = {
  characterAtk: 679,
  handFlatAtk: 352.8,
  critRate: 5,
  critDamage: 50,
};

const rollValues = {
  atkRolls: 3.89,
  crRolls: 2.92,
  cdRolls: 5.83,
  flatAtkRolls: 19,
};

const ids = [
  "characterLevel",
  "characterSelect",
  "lightCone",
  "bodyMainStat",
  "feetMainStat",
  "sphereMainStat",
  "ropeMainStat",
  "resPen",
  "relicSet",
  "atkRolls",
  "crRolls",
  "cdRolls",
  "flatAtkRolls",
  "skillSelect",
  "interpretationStacks",
  "riddleStacks",
  "enemyCount",
  "ultimateAtkBuff",
  "afterUltimate",
  "twoErudition",
  "fullInterpretationTrace",
  "targetBroken",
  "teamAtkBuff",
  "teamDmgBuff",
  "teamCrBuff",
  "teamCdBuff",
  "vulnerability",
  "weaken",
  "enemyLevel",
  "defReduction",
  "defIgnore",
  "enemyRes",
  "mitigation",
  "weaknessPreset",
  "expectedDamage",
  "critDamageResult",
  "normalDamageResult",
  "finalAtk",
  "formulaDebug",
  "copyDebugButton",
];

const el = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
const percent = (value) => Number(value || 0) / 100;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const fmt = (value) => Math.round(value).toLocaleString("zh-TW");
const pct = (value) => `${Number(value).toFixed(2)}%`;
const dec = (value) => Number(value).toFixed(4);
const sumPart = (parts, key) => parts.reduce((total, part) => total + (part?.[key] ?? 0), 0);

function init() {
  character.skills.forEach((skill) => {
    const option = document.createElement("option");
    option.value = skill.id;
    option.textContent = skill.name;
    el.skillSelect.append(option);
  });
  el.skillSelect.value = "enhanced";

  document.querySelectorAll("input, select").forEach((input) => {
    input.addEventListener("input", calculate);
    input.addEventListener("change", calculate);
  });

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => switchView(tab.dataset.view));
  });

  el.weaknessPreset.addEventListener("change", applyWeaknessPreset);
  document.getElementById("presetButton").addEventListener("click", loadPreset);
  el.copyDebugButton.addEventListener("click", copyDebugText);
  applyWeaknessPreset();
  calculate();
}

function switchView(view) {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === view);
  });
  document.querySelectorAll(".view").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `${view}View`);
  });
}

function loadPreset() {
  const preset = {
    resPen: 0,
    atkRolls: 4,
    crRolls: 6,
    cdRolls: 8,
    flatAtkRolls: 2,
    teamCdBuff: 80,
    enemyLevel: 95,
    enemyCount: 3,
    ultimateAtkBuff: character.ultimateAtkBuff,
    interpretationStacks: 42,
    riddleStacks: 40,
  };
  Object.entries(preset).forEach(([key, value]) => {
    el[key].value = value;
  });
  el.lightCone.value = "signature";
  el.bodyMainStat.value = "critDamage";
  el.feetMainStat.value = "atkPercent";
  el.sphereMainStat.value = "iceDmg";
  el.ropeMainStat.value = "atkPercent";
  el.relicSet.value = "scholar";
  el.skillSelect.value = "enhanced";
  el.afterUltimate.checked = true;
  el.twoErudition.checked = true;
  el.fullInterpretationTrace.checked = true;
  el.targetBroken.checked = false;
  calculate();
}

function applyWeaknessPreset() {
  if (el.weaknessPreset.value === "weak") el.enemyRes.value = 0;
  if (el.weaknessPreset.value === "neutral") el.enemyRes.value = 20;
  calculate();
}

function readState(overrides = {}) {
  const relicKey = overrides.relicSet ?? el.relicSet.value;
  const set = relicSets[relicKey] ?? relicSets.none;
  const lightConeKey = overrides.lightCone ?? el.lightCone.value;
  const lightCone = lightCones[lightConeKey] ?? lightCones.none;
  const skill = character.skills.find((item) => item.id === (overrides.skillId ?? el.skillSelect.value));
  const selectedMains = {
    body: mainStatValues.bodyMainStat[overrides.bodyMainStat ?? el.bodyMainStat.value],
    feet: mainStatValues.feetMainStat[overrides.feetMainStat ?? el.feetMainStat.value],
    sphere: mainStatValues.sphereMainStat[overrides.sphereMainStat ?? el.sphereMainStat.value],
    rope: mainStatValues.ropeMainStat[overrides.ropeMainStat ?? el.ropeMainStat.value],
  };
  const mainParts = Object.values(selectedMains);
  const baseAtk = baseStats.characterAtk + lightCone.baseAtk;
  const flatAtkRolls = Number(overrides.flatAtkRolls ?? el.flatAtkRolls.value);
  const flatAtkFromRolls = flatAtkRolls * rollValues.flatAtkRolls;
  const flatAtk = baseStats.handFlatAtk + flatAtkFromRolls;
  const atkRolls = Number(overrides.atkRolls ?? el.atkRolls.value);
  const atkFromRolls = atkRolls * rollValues.atkRolls;
  const ultimateAtkBuff = Number(overrides.ultimateAtkBuff ?? el.ultimateAtkBuff.value);
  const afterUltimate = overrides.afterUltimate ?? el.afterUltimate.checked;

  const atkParts = {
    main: sumPart(mainParts, "atkPercent"),
    team: Number(overrides.teamAtkBuff ?? el.teamAtkBuff.value),
    relic: set.atkPercent ?? 0,
    rolls: atkFromRolls,
    ultimate: afterUltimate ? ultimateAtkBuff : 0,
  };
  const atkPercent = Object.values(atkParts).reduce((total, value) => total + value, 0);

  const critRateParts = {
    base: baseStats.critRate,
    main: sumPart(mainParts, "critRate"),
    team: Number(overrides.teamCrBuff ?? el.teamCrBuff.value),
    relic: set.critRate ?? 0,
    rolls: Number(overrides.crRolls ?? el.crRolls.value) * rollValues.crRolls,
  };
  let critRateRaw = Object.values(critRateParts).reduce((total, value) => total + value, 0);

  const critDamageParts = {
    base: baseStats.critDamage,
    main: sumPart(mainParts, "critDamage"),
    team: Number(overrides.teamCdBuff ?? el.teamCdBuff.value),
    relic: 0,
    rolls: Number(overrides.cdRolls ?? el.cdRolls.value) * rollValues.cdRolls,
  };
  if (set.ultCritDamage && (skill.id === "ultimate" || afterUltimate)) {
    critDamageParts.relic = set.ultCritDamage;
  }
  const critDamage = Object.values(critDamageParts).reduce((total, value) => total + value, 0);

  const dmgParts = {
    main: sumPart(mainParts, "dmgBonus"),
    team: Number(overrides.teamDmgBuff ?? el.teamDmgBuff.value),
    trace: character.traceIceDmg,
    relicBase: set.dmgBonus ?? 0,
    relicSkill: skill.type === "戰技" ? set.skillDmg ?? 0 : 0,
    relicUltimate: skill.type === "終結技" ? set.ultDmg ?? 0 : 0,
    relicConditional:
      (skill.type === "普攻" || skill.type === "戰技") && set.basicSkillDmgWhen70Cr && critRateRaw >= 70
        ? set.basicSkillDmgWhen70Cr
        : 0,
  };
  const dmgBonus = Object.values(dmgParts).reduce((total, value) => total + value, 0);
  const finalAtk = baseAtk * (1 + percent(atkPercent)) + flatAtk;

  return {
    skill,
    set,
    relicKey,
    lightCone,
    selectedMains,
    baseAtk,
    characterBaseAtk: baseStats.characterAtk,
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
    resPen: Number(overrides.resPen ?? el.resPen.value),
    characterLevel: Number(overrides.characterLevel ?? el.characterLevel.value),
    enemyLevel: Number(overrides.enemyLevel ?? el.enemyLevel.value),
    defReduction: Number(overrides.defReduction ?? el.defReduction.value),
    defIgnore: Number(overrides.defIgnore ?? el.defIgnore.value),
    enemyRes: Number(overrides.enemyRes ?? el.enemyRes.value),
    vulnerability: Number(overrides.vulnerability ?? el.vulnerability.value),
    weaken: Number(overrides.weaken ?? el.weaken.value),
    mitigation: Number(overrides.mitigation ?? el.mitigation.value),
    enemyCount: Number(overrides.enemyCount ?? el.enemyCount.value),
    interpretationStacks: Number(overrides.interpretationStacks ?? el.interpretationStacks.value),
    riddleStacks: Number(overrides.riddleStacks ?? el.riddleStacks.value),
    twoErudition: overrides.twoErudition ?? el.twoErudition.checked,
    fullInterpretationTrace: overrides.fullInterpretationTrace ?? el.fullInterpretationTrace.checked,
    targetBroken: overrides.targetBroken ?? el.targetBroken.checked,
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

function calculateDamage(overrides = {}) {
  const state = readState(overrides);
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

function calculate() {
  const result = calculateDamage();
  el.expectedDamage.textContent = fmt(result.expected);
  el.critDamageResult.textContent = fmt(result.crit);
  el.normalDamageResult.textContent = fmt(result.normal);
  el.finalAtk.textContent = fmt(result.state.finalAtk);
  renderBreakdown(result);
  renderOptimization(result);
  renderFormulaDebug(result);
}

function renderBreakdown(result) {
  const html = result.hits
    .map(
      (hit) => `
        <div class="breakdown-item">
          <div>
            <strong>${hit.label}</strong>
            <span>倍率 ${hit.ability.toFixed(1)}% x 目標 ${hit.targets} x 次數 ${hit.repeats}</span>
          </div>
          <strong>${fmt(hit.expected)}</strong>
        </div>
      `,
    )
    .join("");
  document.getElementById("skillBreakdown").innerHTML = `<div class="breakdown-list">${html}</div>`;
}

function renderOptimization(baseResult) {
  const candidates = [
    ["攻擊% 詞條 +1", { atkRolls: Number(el.atkRolls.value) + 1 }],
    ["暴率詞條 +1", { crRolls: Number(el.crRolls.value) + 1 }],
    ["暴傷詞條 +1", { cdRolls: Number(el.cdRolls.value) + 1 }],
    ["固定攻擊詞條 +1", { flatAtkRolls: Number(el.flatAtkRolls.value) + 1 }],
    ["抗穿 +10%", { resPen: Number(el.resPen.value) + 10 }],
    ["防禦降低 +10%", { defReduction: Number(el.defReduction.value) + 10 }],
  ].map(([label, override]) => {
    const next = calculateDamage(override).expected;
    return { label, gain: (next / baseResult.expected - 1) * 100 };
  });

  candidates.sort((a, b) => b.gain - a.gain);
  const best = candidates[0];
  document.getElementById("bestInsight").textContent =
    `${best.label} 目前提升最大，約增加 ${best.gain.toFixed(2)}%。` +
    "這是用當前面板做邊際比較，適合用來決定接下來該補哪一類詞條或隊友 Buff。";

  document.getElementById("marginalTable").innerHTML = candidates
    .slice(0, 4)
    .map((item) => `<div class="mini-row"><span>${item.label}</span><strong>+${item.gain.toFixed(2)}%</strong></div>`)
    .join("");
}

function renderFormulaDebug(result) {
  const { state, multipliers } = result;
  const lines = [
    "總公式",
    "單段基礎傷害 = 最終攻擊力 x 技能倍率 x 目標數 x 重複次數",
    "非暴擊傷害 = 單段基礎傷害 x 增傷乘區 x 防禦乘區 x 抗性乘區 x 易傷乘區 x 我方傷害降低乘區 x 敵方減傷乘區 x 弱點擊破乘區",
    "暴擊傷害 = 非暴擊傷害 x (1 + 暴擊傷害)",
    "期望傷害 = 非暴擊傷害 x (1 + min(暴擊率, 100%) x 暴擊傷害)",
    "",
    "面板",
    `套裝 = ${state.set.label}`,
    `光錐 = ${state.lightCone.label}`,
    `主詞條 = 軀幹 ${state.selectedMains.body.label} / 腳部 ${state.selectedMains.feet.label} / 位面球 ${state.selectedMains.sphere.label} / 連結繩 ${state.selectedMains.rope.label}`,
    `基礎攻擊 = 角色 ${state.characterBaseAtk.toFixed(1)} + 光錐 ${state.lightConeBaseAtk.toFixed(1)} = ${state.baseAtk.toFixed(1)}`,
    `總攻擊% = 主詞條 ${pct(state.atkParts.main)} + 隊友 ${pct(state.atkParts.team)} + 套裝 ${pct(state.atkParts.relic)} + 副詞條 ${pct(state.atkParts.rolls)} + 終結技 ${pct(state.atkParts.ultimate)} = ${pct(state.atkPercent)}`,
    `固定攻擊 = 手部主詞條 ${state.handFlatAtk.toFixed(1)} + 副詞條 ${state.flatAtkFromRolls.toFixed(1)} = ${state.flatAtk.toFixed(1)}`,
    `最終攻擊力 = ${state.baseAtk.toFixed(1)} x (1 + ${pct(state.atkPercent)}) + ${state.flatAtk.toFixed(1)} = ${state.finalAtk.toFixed(1)}`,
    `暴擊率 = 基礎 ${pct(state.critRateParts.base)} + 主詞條 ${pct(state.critRateParts.main)} + 隊友 ${pct(state.critRateParts.team)} + 套裝 ${pct(state.critRateParts.relic)} + 副詞條 ${pct(state.critRateParts.rolls)} = ${pct(state.critRateRaw)}，計算用 ${pct(state.critRate)}`,
    `暴擊傷害 = 基礎 ${pct(state.critDamageParts.base)} + 主詞條 ${pct(state.critDamageParts.main)} + 隊友 ${pct(state.critDamageParts.team)} + 套裝 ${pct(state.critDamageParts.relic)} + 副詞條 ${pct(state.critDamageParts.rolls)} = ${pct(state.critDamage)}`,
    `增傷% = 主詞條 ${pct(state.dmgParts.main)} + 隊友 ${pct(state.dmgParts.team)} + 行跡冰傷 ${pct(state.dmgParts.trace)} + 套裝基礎 ${pct(state.dmgParts.relicBase)} + 套裝技能 ${pct(state.dmgParts.relicSkill)} + 套裝終結技 ${pct(state.dmgParts.relicUltimate)} + 套裝條件 ${pct(state.dmgParts.relicConditional)} + 42層行跡 ${pct(result.traceDmg)} = ${pct(state.dmgBonus + result.traceDmg)}`,
    "",
    "乘區",
    `增傷乘區 = 1 + ${pct(state.dmgBonus + result.traceDmg)} = ${dec(result.dmgBoost)}`,
    `防禦乘區 = (角色等級 + 20) / ((敵人等級 + 20) x (1 - 防禦降低/無視) + 角色等級 + 20) = (${state.characterLevel} + 20) / ((${state.enemyLevel} + 20) x (1 - ${pct(multipliers.defReductionTotal)}) + ${state.characterLevel} + 20) = ${dec(multipliers.defMult)}`,
    `抗性乘區 = 1 - (敵人抗性 - 抗性穿透) = 1 - (${pct(state.enemyRes)} - ${pct(state.resPen)}) = ${dec(multipliers.resMult)}`,
    `易傷乘區 = 1 + ${pct(state.vulnerability)} = ${dec(multipliers.vulnMult)}`,
    `我方傷害降低乘區 = 1 - ${pct(state.weaken)} = ${dec(multipliers.weakenMult)}`,
    `敵方減傷乘區 = 1 - ${pct(state.mitigation)} = ${dec(multipliers.mitigationMult)}`,
    `弱點擊破乘區 = ${state.targetBroken ? "已擊破" : "未擊破"} = ${dec(multipliers.brokenMult)}`,
    `共同乘區 = ${dec(result.common)}`,
    `暴擊乘區 = 1 + ${pct(state.critDamage)} = ${dec(result.critMult)}`,
    `期望暴擊乘區 = 1 + ${pct(state.critRate)} x ${pct(state.critDamage)} = ${dec(result.expectedCritMult)}`,
    "",
    "各段 Hit",
    ...result.hits.flatMap((hit, index) => [
      `${index + 1}. ${hit.label}`,
      `   基礎 = ${state.finalAtk.toFixed(1)} x ${pct(hit.ability)} x ${hit.targets} x ${hit.repeats} = ${hit.base.toFixed(1)}`,
      `   非暴擊 = ${hit.base.toFixed(1)} x ${dec(result.common)} = ${hit.normal.toFixed(1)}`,
      `   暴擊 = ${hit.normal.toFixed(1)} x ${dec(result.critMult)} = ${hit.crit.toFixed(1)}`,
      `   期望 = ${hit.normal.toFixed(1)} x ${dec(result.expectedCritMult)} = ${hit.expected.toFixed(1)}`,
    ]),
    "",
    `合計非暴擊 = ${result.normal.toFixed(1)}`,
    `合計暴擊 = ${result.crit.toFixed(1)}`,
    `合計期望 = ${result.expected.toFixed(1)}`,
  ];
  el.formulaDebug.textContent = lines.join("\n");
}

async function copyDebugText() {
  const text = el.formulaDebug.textContent;
  try {
    await navigator.clipboard.writeText(text);
    el.copyDebugButton.textContent = "已複製";
    window.setTimeout(() => {
      el.copyDebugButton.textContent = "複製公式";
    }, 1200);
  } catch {
    el.copyDebugButton.textContent = "無法複製";
    window.setTimeout(() => {
      el.copyDebugButton.textContent = "複製公式";
    }, 1200);
  }
}

init();
