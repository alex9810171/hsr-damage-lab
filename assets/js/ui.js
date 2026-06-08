import { calculateDamage, fmt } from "./calculator.js";
import { renderFormulaDebug } from "./formula-debug.js";

const TEAMMATE_LIGHT_CONES = {
  none: [
    ["none", "未套用"],
  ],
  anaxa: [
    ["lifeShouldBeCast", "不息的演算（自身效果，V1 不加成大黑塔）"],
    ["none", "未套用"],
  ],
  tribbie: [
    ["danceDanceDance", "舞！舞！舞！（行動提前，V1 不計入）"],
    ["none", "未套用"],
  ],
  hyacine: [
    ["rainbow", "愿虹光永駐天空（敵方受到傷害 +18%）"],
    ["none", "未套用"],
  ],
  default: [
    ["none", "未套用"],
  ],
};

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
    "hertaEidolon",
    "hertaEidolonSummary",
    "hertaEidolonEffects",
    "hertaEidolonButtons",
    "targetBroken",
    "teammate1",
    "teammate1Eidolon",
    "teammate1LightCone",
    "teammate1Cavern",
    "teammate1Planar",
    "teammate2",
    "teammate2Eidolon",
    "teammate2LightCone",
    "teammate2Cavern",
    "teammate2Planar",
    "teammate3",
    "teammate3Eidolon",
    "teammate3LightCone",
    "teammate3Cavern",
    "teammate3Planar",
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
    "teamSummary",
    "teamEffectSummary",
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
    populateTeammateEquipmentOptions();
    populateTeams();
    bindTeamFieldSync();
    bindHertaEidolonButtons();
    bindTeammateCharacterEquipmentSync();
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
      refreshLightConeOptions(slot, member.id);
      setValue(`teammate${slot}LightCone`, member.lightConeId ?? "none");
      setValue(`teammate${slot}Cavern`, member.cavernSet ?? "none");
      setValue(`teammate${slot}Planar`, member.planarSet ?? "none");
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
      atkRolls: 3,
      crRolls: 10,
      cdRolls: 17,
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
    setValue("hertaEidolon", 0);
    syncHertaEidolonButtons();
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
    setDamageCard("expectedDamage", result.expectedBreakdown);
    setDamageCard("critDamageResult", result.critBreakdown);
    setDamageCard("normalDamageResult", result.normalBreakdown);
    setText("damageFactorTotal", formatFactorCardValue(findFactor(result, "技能總倍率")));
    setText("fullExpectedMultiplier", formatFactorCardValue(findFactor(result, "不含攻擊力期望倍率")));
    setText("finalAtk", fmt(result.state.finalAtk));
    renderBreakdown(result);
    renderFactorSummary(result);
    renderTeamSummary(result);
    renderHertaEidolonSummary(result);
    renderMarginalReference(result);
    setText("formulaDebug", renderFormulaDebug(result));
  }

  function renderBreakdown(result) {
    document.getElementById("skillBreakdown").innerHTML = `
      ${renderTargetOverview(result.targetDistribution)}
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
          <li><span>非暴擊</span><strong>${fmt(item.normal)}</strong></li>
          <li><span>暴擊</span><strong>${fmt(item.crit)}</strong></li>
          <li><span>期望</span><strong>${fmt(item.expected)}</strong></li>
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
              <li class="${item.unit === "section" ? "factor-section" : ""}">
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
    if (item.unit === "section") return "";
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
      "teammate1LightCone",
      "teammate1Cavern",
      "teammate1Planar",
      "teammate2",
      "teammate2Eidolon",
      "teammate2LightCone",
      "teammate2Cavern",
      "teammate2Planar",
      "teammate3",
      "teammate3Eidolon",
      "teammate3LightCone",
      "teammate3Cavern",
      "teammate3Planar",
    ];
  }

  function populateTeammateEquipmentOptions() {
    [1, 2, 3].forEach((slot) => {
      refreshLightConeOptions(slot, el[`teammate${slot}`]?.value ?? "none");
      populateRelicSelect(el[`teammate${slot}Cavern`], "cavern");
      populateRelicSelect(el[`teammate${slot}Planar`], "planar");
    });
  }

  function populateRelicSelect(select, category) {
    if (!select) return;
    select.replaceChildren();
    Object.entries(data.relicSets)
      .filter(([, set]) => set.category === category || set.category === "any")
      .forEach(([id, set]) => {
        const option = document.createElement("option");
        option.value = id;
        option.textContent = `[${set.supportStatus ?? "待核對"}] ${set.label}${set.notes ? `：${set.notes}` : ""}`;
        select.append(option);
      });
  }

  function refreshLightConeOptions(slot, teammateId) {
    const select = el[`teammate${slot}LightCone`];
    if (!select) return;
    const current = select.value;
    const options = TEAMMATE_LIGHT_CONES[teammateId] ?? TEAMMATE_LIGHT_CONES.default;
    select.replaceChildren();
    options.forEach(([id, label]) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = label;
      select.append(option);
    });
    select.value = options.some(([id]) => id === current) ? current : options[0][0];
  }

  function bindTeammateCharacterEquipmentSync() {
    [1, 2, 3].forEach((slot) => {
      el[`teammate${slot}`]?.addEventListener("change", () => {
        refreshLightConeOptions(slot, el[`teammate${slot}`].value);
      });
    });
  }

  function bindHertaEidolonButtons() {
    el.hertaEidolonButtons?.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        setValue("hertaEidolon", button.dataset.eidolon);
        syncHertaEidolonButtons();
        calculate();
      });
    });
  }

  function syncHertaEidolonButtons() {
    const current = String(el.hertaEidolon?.value ?? "0");
    el.hertaEidolonButtons?.querySelectorAll("button").forEach((button) => {
      const active = button.dataset.eidolon === current;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function renderTeamSummary(result) {
    if (!el.teamSummary) return;
    setText("teamSummary", `目前隊伍：${result.state.fullTeamMembers.map((member) => member.name).join(" / ")}`);
    el.teamEffectSummary.innerHTML = result.state.teamAutoBuffs.sources
      .map((source) => `<div>${escapeHtml(source)}</div>`)
      .join("");
  }

  function renderHertaEidolonSummary(result) {
    const eidolon = result.state.hertaEidolon;
    setText("hertaEidolonSummary", `${eidolon} 魂`);
    if (!el.hertaEidolonEffects) return;
    const interpretationStatus = [
      `實際解讀層數：${result.state.interpretationStacks}`,
      `一魂倍率：${result.state.interpretationEidolonMultiplier.toFixed(1)}x`,
      `有效解讀層數：${result.state.effectiveInterpretationStacks}`,
      `42 層行跡增傷：${result.traceDmg ? "已觸發" : "未觸發"}`,
      `智識角色數量：${result.state.eruditionCount}`,
      `2 智識效果：${result.state.twoErudition ? "已啟用" : "未啟用"}`,
    ];
    el.hertaEidolonEffects.innerHTML = [...interpretationStatus, ...result.state.hertaEidolonEffects]
      .map((effect) => `<div>${escapeHtml(effect)}</div>`)
      .join("");
  }

  function setDamageCard(id, breakdown) {
    const node = el[id];
    if (!node) return;
    if (!breakdown?.extra) {
      node.textContent = fmt(breakdown?.total ?? 0);
      return;
    }
    node.innerHTML = `
      <span class="damage-line"><b>大黑塔本體</b>${fmt(breakdown.base)}</span>
      <span class="damage-line"><b>緹寶 1 魂真實傷害</b>${fmt(breakdown.extra)}</span>
      <span class="damage-line total"><b>合計</b>${fmt(breakdown.total)}</span>
    `;
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
