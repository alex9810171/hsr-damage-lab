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
    "afterUltimate",
    "twoErudition",
    "fullInterpretationTrace",
    "hertaE1",
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
    "damageFactorTotal",
    "fullExpectedMultiplier",
    "finalAtk",
    "formulaDebug",
    "copyDebugButton",
    "factorSummary",
  ];
  const el = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));

  function init() {
    const missing = Object.entries(el)
      .filter(([, node]) => !node)
      .map(([id]) => id);
    if (missing.length) {
      console.warn(`Missing UI elements: ${missing.join(", ")}`);
    }
    populateSkills();
    populateTeams();
    bindTeamFieldSync();
    document.querySelectorAll("input, select").forEach((input) => {
      input.addEventListener("input", calculate);
      input.addEventListener("change", calculate);
    });
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => switchView(tab.dataset.view));
    });
    el.weaknessPreset?.addEventListener("change", applyWeaknessPreset);
    document.getElementById("presetButton").addEventListener("click", loadPreset);
    el.copyDebugButton?.addEventListener("click", copyDebugText);
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
    if (!el.teamPreset) return;
    el.teamPreset.replaceChildren();
    const customOption = document.createElement("option");
    customOption.value = "custom";
    customOption.textContent = "自訂隊伍";
    el.teamPreset.append(customOption);
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

  function bindTeamFieldSync() {
    teamFieldIds().forEach((id) => {
      const markCustom = () => {
        if (el.teamPreset?.value !== "custom") {
          setValue("teamPreset", "custom");
        }
        calculate();
      };
      el[id]?.addEventListener("input", markCustom);
      el[id]?.addEventListener("change", markCustom);
    });
  }

  function applyTeamToFields() {
    if (!el.teamPreset) return;
    const team = data.teams[el.teamPreset.value];
    if (!team) return;
    team.members.slice(1).forEach((member, index) => {
      const slot = index + 1;
      setValue(`teammate${slot}`, member.id);
      setValue(`teammate${slot}Eidolon`, member.eidolon);
      setValue(
        `teammate${slot}Setup`,
        member.signatureSuperimposition > 0 && member.planarSet !== "none"
          ? "signatureRelic"
          : member.signatureSuperimposition > 0
            ? "signature"
            : member.planarSet !== "none"
              ? "relic"
              : "none",
      );
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
      atkRolls: 5,
      crRolls: 15,
      cdRolls: 10,
      flatAtkRolls: 0,
      teamAtkBuff: 0,
      teamDmgBuff: 0,
      teamCrBuff: 0,
      teamCdBuff: 80,
      enemyLevel: 95,
      enemyCount: 3,
      interpretationStacks: 42,
      riddleStacks: 99,
    };
    Object.entries(preset).forEach(([key, value]) => {
      setValue(key, value);
    });
    setValue("teamPreset", "theHertaDefault");
    setValue("lightCone", "signature");
    setValue("bodyMainStat", "critRate");
    setValue("feetMainStat", "atkPercent");
    setValue("sphereMainStat", "iceDmg");
    setValue("ropeMainStat", "atkPercent");
    setValue("cavernSet", "scholar");
    setValue("planarSet", "izumo");
    setValue("skillSelect", "enhanced");
    applyTeamToFields();
    setChecked("afterUltimate", true);
    setChecked("twoErudition", true);
    setChecked("fullInterpretationTrace", true);
    setChecked("hertaE1", false);
    setChecked("targetBroken", false);
    calculate();
  }

  function applyWeaknessPreset() {
    if (el.weaknessPreset?.value === "weak") setValue("enemyRes", 0);
    if (el.weaknessPreset?.value === "neutral") setValue("enemyRes", 20);
    calculate();
  }

  function calculate() {
    const result = calculateDamage(data, readInputs());
    setText("expectedDamage", fmt(result.expected));
    setText("critDamageResult", fmt(result.crit));
    setText("normalDamageResult", fmt(result.normal));
    setText("damageFactorTotal", formatFactorCardValue(findFactor(result, "技能總倍率")));
    setText("fullExpectedMultiplier", formatFactorCardValue(findFactor(result, "不含攻擊力期望倍率")));
    setText("finalAtk", fmt(result.state.finalAtk));
    renderBreakdown(result);
    renderFactorSummary(result);
    renderMarginalReference(result);
    setText("formulaDebug", renderFormulaDebug(result));
  }

  function renderBreakdown(result) {
    const baseHits = result.hits.filter((hit) => hit.rowLabel !== "解讀層數倍率");
    const interpretationHits = result.hits.filter((hit) => hit.rowLabel === "解讀層數倍率");
    document.getElementById("skillBreakdown").innerHTML = `
      ${renderTargetOverview(result.targetDistribution)}
      ${renderHitGroup("基礎命中列", summarizeHits(baseHits), false)}
      ${interpretationHits.length ? renderHitGroup("解讀層數倍率", summarizeHits(interpretationHits, true), false) : ""}
      <details class="breakdown-section">
        <summary>詳細 hit 計算</summary>
        <div class="breakdown-list compact-list">
          ${result.hits.map(renderDetailedHit).join("")}
        </div>
      </details>
    `;
  }

  function renderTargetOverview(distribution = []) {
    if (!distribution.length) return "";
    return `
      <details class="breakdown-section target-overview" open>
        <summary>目標總覽</summary>
        <div class="target-distribution">
          ${distribution.map(renderTargetChip).join("")}
        </div>
      </details>
    `;
  }

  function renderTargetChip(item) {
    return `
      <details class="target-chip">
        <summary>
          <strong>${escapeHtml(item.label)}</strong>
          <span>${item.multiplier.toFixed(0)}%</span>
        </summary>
        <ul>
          ${(item.parts ?? [])
            .map((part) => `<li><span>${escapeHtml(part.label)}</span><strong>${part.multiplier.toFixed(0)}%</strong></li>`)
            .join("")}
          <li class="target-total"><span>合計</span><strong>${item.multiplier.toFixed(0)}%</strong></li>
        </ul>
      </details>
    `;
  }

  function renderHitGroup(title, rows, open = false) {
    if (!rows.length) return "";
    return `
      <details class="breakdown-section"${open ? " open" : ""}>
        <summary>${escapeHtml(title)}</summary>
        <div class="breakdown-list">
          ${rows
            .map(
              (row) => `
                <div class="breakdown-item breakdown-row">
                  <strong>${escapeHtml(row.label)}</strong>
                  <span>倍率：${row.ability.toFixed(0)}%</span>
                  <span>目標：${row.targets}</span>
                  <span>次數：${row.repeats}</span>
                  <strong>${fmt(row.expected)}</strong>
                </div>
              `,
            )
            .join("")}
        </div>
      </details>
    `;
  }

  function renderDetailedHit(hit) {
    return `
      <div class="breakdown-item detail-hit">
        <strong>${escapeHtml(hit.label)}</strong>
        <span>倍率：${hit.ability.toFixed(0)}%</span>
        <span>目標：${hit.targets}</span>
        <span>次數：${hit.repeats}</span>
        <strong>${fmt(hit.expected)}</strong>
      </div>
    `;
  }

  function summarizeHits(hits, useTargetLabel = false) {
    const rows = new Map();
    hits.forEach((hit) => {
      const label = useTargetLabel ? targetLabel(hit.position) : hit.rowLabel;
      const current = rows.get(label) ?? {
        label,
        ability: hit.ability,
        targets: 0,
        repeats: hit.repeats,
        expected: 0,
      };
      current.targets += hit.targets;
      current.expected += hit.expected;
      rows.set(label, current);
    });
    return [...rows.values()];
  }

  function renderMarginalReference(baseResult) {
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
      const gain = baseResult.expected > 0 ? (next / baseResult.expected - 1) * 100 : 0;
      return { label, gain };
    });

    candidates.sort((a, b) => b.gain - a.gain);
    const top = candidates[0];
    document.getElementById("configInsight").textContent =
      `以下比較是以目前完整配置作為 1.0000x 基準，單獨增加或切換一項可配置變數後的相對提升。` +
      `目前最高單步項目：${top.label} 約增加 ${top.gain.toFixed(2)}%。` +
      "這不是最佳化器，也不代表已搜尋所有配置。";

    document.getElementById("marginalTable").innerHTML = candidates
      .slice(0, 4)
      .map((item) => `<div class="mini-row"><span>${item.label}</span><strong>+${item.gain.toFixed(2)}%</strong></div>`)
      .join("");
  }

  function renderFactorSummary(result) {
    if (!el.factorSummary) return;
    el.factorSummary.innerHTML = result.factorSummary
      .map(
        (factor) => `
          <details class="factor-row">
            <summary>
              <span class="factor-title">${escapeHtml(factor.label)}</span>
              <strong>${formatFactorValue(factor)}</strong>
            </summary>
            <div class="factor-body">
              <p>${escapeHtml(factor.formula)}${factor.detail ? `：${escapeHtml(factor.detail)}` : ""}</p>
              ${renderFactorHelp(factor)}
              ${renderFactorParts(factor.parts)}
            </div>
          </details>
        `,
      )
      .join("");
  }

  function renderFactorHelp(factor) {
    if (factor.label === "相對基準總倍率") {
      return `<p class="factor-note">相對基準總倍率是以基準狀態作為 1.0000x 的比較值，不是遊戲公式中的原始乘區。</p>`;
    }
    if (factor.label === "防禦區") {
      return `<p class="factor-note">防禦區顯示的是實際公式乘區，例如 0.4651x 會直接進入傷害公式。防禦相對倍率是目前防禦區 / 基準防禦區；邊際提升參考中的防禦降低 +10% 是相對於目前配置的提升，不是直接把防禦區加 10%。</p>`;
    }
    if (factor.label === "弱點區") {
      return `<p class="factor-note">弱點區屬於戰鬥狀態乘區，保留於實際公式中，也可納入相對基準總倍率；但不列入邊際提升參考。</p>`;
    }
    if (factor.label === "通用乘區倍率") {
      return `<p class="factor-note">實際公式乘區會直接進入傷害公式；邊際提升參考則是用新期望傷害 / 原期望傷害 - 1 觀察單步變動。</p>`;
    }
    return "";
  }

  function renderFactorParts(parts = []) {
    if (!parts.length) return "";
    return `
      <ul class="factor-parts">
        ${parts
          .map(
            (item) => `
              <li>
                <span>${escapeHtml(item.label)}</span>
              <strong>${formatPartValue(item)}</strong>
                ${item.note ? `<em>${escapeHtml(item.note)}</em>` : ""}
              </li>
            `,
          )
          .join("")}
      </ul>
    `;
  }

  function formatFactorValue(factor) {
    const value = Number(factor.value || 0);
    if (factor.unit === "atk") return fmt(value);
    if (factor.unit === "x") return `${value.toFixed(4)}x`;
    return value.toFixed(4);
  }

  function formatPartValue(item) {
    const value = Number(item.value || 0);
    if (item.unit === "note") return "";
    if (item.unit === "%") return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
    if (item.unit === "x") return `${value.toFixed(4)}x`;
    return value.toFixed(1);
  }

  function findFactor(result, label) {
    return result.factorSummary.find((factor) => factor.label === label)?.value ?? 0;
  }

  function formatFactorCardValue(value) {
    return `${Number(value || 0).toFixed(4)}x`;
  }

  function targetLabel(position) {
    if (position === 0) return "主目標";
    if (position === -1) return "左一";
    if (position === -2) return "左二";
    if (position === 1) return "右一";
    if (position === 2) return "右二";
    return `目標 ${position}`;
  }

  function teamFieldIds() {
    return [
      "teammate1",
      "teammate1Eidolon",
      "teammate1Setup",
      "teammate2",
      "teammate2Eidolon",
      "teammate2Setup",
      "teammate3",
      "teammate3Eidolon",
      "teammate3Setup",
    ];
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function copyDebugText() {
    try {
      await navigator.clipboard.writeText(el.formulaDebug.textContent);
      setText("copyDebugButton", "已複製");
    } catch {
      setText("copyDebugButton", "無法複製");
    }
    window.setTimeout(() => {
      setText("copyDebugButton", "複製公式");
    }, 1200);
  }

  function setValue(id, value) {
    if (el[id]) el[id].value = value;
  }

  function setChecked(id, value) {
    if (el[id]) el[id].checked = value;
  }

  function setText(id, value) {
    if (el[id]) el[id].textContent = value;
  }

  return { init };
}
