import { calculateDamage, fmt } from "./calculator.js";
import { renderFormulaDebug } from "./formula-debug.js";

export function createUI(data) {
  const ids = [
    "characterLevel",
    "characterSelect",
    "teamPreset",
    "lightCone",
    "bodyMainStat",
    "feetMainStat",
    "sphereMainStat",
    "ropeMainStat",
    "cavernSet",
    "planarSet",
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
    "teammate1",
    "teammate1Eidolon",
    "teammate1Setup",
    "teammate2",
    "teammate2Eidolon",
    "teammate2Setup",
    "teammate3",
    "teammate3Eidolon",
    "teammate3Setup",
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
    "factorSummary",
  ];
  const el = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));

  function init() {
    populateSkills();
    populateTeams();
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
    loadPreset();
    applyWeaknessPreset();
    calculate();
  }

  function readInputs() {
    const inputs = {};
    Object.entries(el).forEach(([key, node]) => {
      if (!node) return;
      if (node instanceof HTMLInputElement && node.type === "checkbox") {
        inputs[key] = node.checked;
      } else {
        inputs[key] = node.value;
      }
    });
    return inputs;
  }

  function populateSkills() {
    el.skillSelect.replaceChildren();
    data.character.skills.forEach((skill) => {
      const option = document.createElement("option");
      option.value = skill.id;
      option.textContent = skill.name;
      el.skillSelect.append(option);
    });
    el.skillSelect.value = "enhanced";
  }

  function populateTeams() {
    el.teamPreset.replaceChildren();
    Object.entries(data.teams).forEach(([id, team]) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = team.label;
      el.teamPreset.append(option);
    });
    el.teamPreset.value = "theHertaDefault";
    applyTeamToFields();
    el.teamPreset.addEventListener("change", () => {
      applyTeamToFields();
      calculate();
    });
  }

  function applyTeamToFields() {
    const team = data.teams[el.teamPreset.value];
    if (!team) return;
    team.members.slice(1).forEach((member, index) => {
      const slot = index + 1;
      el[`teammate${slot}`].value = member.id;
      el[`teammate${slot}Eidolon`].value = member.eidolon;
      el[`teammate${slot}Setup`].value =
        member.signatureSuperimposition > 0 && member.planarSet !== "none"
          ? "signatureRelic"
          : member.signatureSuperimposition > 0
            ? "signature"
            : member.planarSet !== "none"
              ? "relic"
              : "none";
    });
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
      atkRolls: 4,
      crRolls: 6,
      cdRolls: 8,
      flatAtkRolls: 2,
      teamAtkBuff: 0,
      teamDmgBuff: 0,
      teamCrBuff: 0,
      teamCdBuff: 80,
      enemyLevel: 95,
      enemyCount: 3,
      ultimateAtkBuff: data.character.ultimateAtkBuff,
      interpretationStacks: 42,
      riddleStacks: 40,
    };
    Object.entries(preset).forEach(([key, value]) => {
      el[key].value = value;
    });
    el.teamPreset.value = "theHertaDefault";
    el.lightCone.value = "signature";
    el.bodyMainStat.value = "critDamage";
    el.feetMainStat.value = "atkPercent";
    el.sphereMainStat.value = "iceDmg";
    el.ropeMainStat.value = "atkPercent";
    el.cavernSet.value = "scholar";
    el.planarSet.value = "izumo";
    el.skillSelect.value = "enhanced";
    applyTeamToFields();
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

  function calculate() {
    const result = calculateDamage(data, readInputs());
    el.expectedDamage.textContent = fmt(result.expected);
    el.critDamageResult.textContent = fmt(result.crit);
    el.normalDamageResult.textContent = fmt(result.normal);
    el.finalAtk.textContent = fmt(result.state.finalAtk);
    renderBreakdown(result);
    renderFactorSummary(result);
    renderOptimization(result);
    el.formulaDebug.textContent = renderFormulaDebug(result);
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
    const current = readInputs();
    const candidates = [
      ["攻擊% 詞條 +1", { atkRolls: Number(current.atkRolls) + 1 }],
      ["暴率詞條 +1", { crRolls: Number(current.crRolls) + 1 }],
      ["暴傷詞條 +1", { cdRolls: Number(current.cdRolls) + 1 }],
      ["固定攻擊詞條 +1", { flatAtkRolls: Number(current.flatAtkRolls) + 1 }],
      ["防禦降低 +10%", { defReduction: Number(current.defReduction) + 10 }],
      ["易傷 +10%", { vulnerability: Number(current.vulnerability) + 10 }],
    ].map(([label, override]) => {
      const next = calculateDamage(data, current, override).expected;
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

  function renderFactorSummary(result) {
    el.factorSummary.innerHTML = result.factorSummary
      .map(
        (factor) => `
          <div class="factor-row">
            <div>
              <strong>${factor.label}</strong>
              <span>${factor.formula}${factor.detail ? `：${factor.detail}` : ""}</span>
            </div>
            <strong>${factor.value.toFixed(4)}</strong>
          </div>
        `,
      )
      .join("");
  }

  async function copyDebugText() {
    try {
      await navigator.clipboard.writeText(el.formulaDebug.textContent);
      el.copyDebugButton.textContent = "已複製";
    } catch {
      el.copyDebugButton.textContent = "無法複製";
    }
    window.setTimeout(() => {
      el.copyDebugButton.textContent = "複製公式";
    }, 1200);
  }

  return { init };
}
