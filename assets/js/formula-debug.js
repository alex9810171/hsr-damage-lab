import { dec, pct } from "./calculator.js";

export function renderFormulaDebug(result) {
  const { state, multipliers } = result;
  const character = state.character;
  const teamSources = state.teamAutoBuffs.sources.length ? state.teamAutoBuffs.sources.join("，") : "無";
  const interpretationMainPerStack = state.twoErudition ? 16 : 8;
  const interpretationAdjacentPerStack = state.twoErudition ? 8 : 4;
  const interpretationEidolonMult = state.hertaE1 ? 1.5 : 1;
  const riddleHit = state.skill.hits.find((hit) => hit.riddle);
  const riddleDetail =
    state.skill.id === "ultimate" && riddleHit
      ? `終結技謎底層數 = 基礎 ${pct(riddleHit.multiplier)} + ${state.riddleStacks} 層 x 1%`
      : "終結技謎底層數 = 非終結技，不套用";

  const lines = [
    "公式 Debug",
    "單段基礎傷害 = 最終攻擊力 x 技能倍率 x 目標數 x 重複次數",
    "非暴擊傷害 = 單段基礎傷害 x 增傷乘區 x 防禦乘區 x 抗性乘區 x 易傷乘區 x 造成傷害降低乘區 x 減傷乘區 x 破韌乘區",
    "暴擊傷害 = 非暴擊傷害 x (1 + 暴擊傷害)",
    "期望傷害 = 非暴擊傷害 x (1 + min(暴擊率, 100%) x 暴擊傷害)",
    "V1 未套用大黑塔 6 魂終結技依敵人數增加的 140% / 250% / 400% 額外倍率",
    "",
    "配置",
    `隊伍 = ${state.teamLabel}`,
    `實際隊友 = ${state.activeTeamMembers.map((member) => `${member.name} E${member.eidolon} / ${member.setup}`).join("；")}`,
    `隊伍自動效果 = ${teamSources}`,
    `隧洞遺器 = ${state.cavernSet.label}`,
    `位面飾品 = ${state.planarSet.label}`,
    `光錐 = ${state.lightCone.label}`,
    `主詞條 = 軀幹 ${state.selectedMains.body.label} / 腳部 ${state.selectedMains.feet.label} / 位面球 ${state.selectedMains.sphere.label} / 連結繩 ${state.selectedMains.rope.label}`,
    `大黑塔總屬性加成 = 攻擊力 ${pct(character.traceStats.atkPercent)} / 速度 +${character.traceStats.speed} / 冰屬性傷害 ${pct(character.traceStats.iceDmg)}`,
    `基礎攻擊 = 角色 ${state.characterBaseAtk.toFixed(1)} + 光錐 ${state.lightConeBaseAtk.toFixed(1)} = ${state.baseAtk.toFixed(1)}`,
    `總攻擊% = 主詞條 ${pct(state.atkParts.main)} + 行跡 ${pct(state.atkParts.trace)} + 隊伍/校正 ${pct(state.atkParts.team)} + 套裝 ${pct(state.atkParts.relic)} + 副詞條 ${pct(state.atkParts.rolls)} + 大黑塔終結技後攻擊 Buff ${pct(state.atkParts.ultimate)} = ${pct(state.atkPercent)}`,
    `固定攻擊 = 手部主詞條 ${state.handFlatAtk.toFixed(1)} + 副詞條 ${state.flatAtkFromRolls.toFixed(1)} = ${state.flatAtk.toFixed(1)}`,
    `最終攻擊力 = ${state.baseAtk.toFixed(1)} x (1 + ${pct(state.atkPercent)}) + ${state.flatAtk.toFixed(1)} = ${state.finalAtk.toFixed(1)}`,
    `暴擊率 = 基礎 ${pct(state.critRateParts.base)} + 主詞條 ${pct(state.critRateParts.main)} + 光錐 ${pct(state.critRateParts.lightCone)} + 隊伍/校正 ${pct(state.critRateParts.team)} + 套裝 ${pct(state.critRateParts.relic)} + 副詞條 ${pct(state.critRateParts.rolls)} = ${pct(state.critRateRaw)}，計算用 ${pct(state.critRate)}`,
    `暴擊傷害 = 基礎 ${pct(state.critDamageParts.base)} + 主詞條 ${pct(state.critDamageParts.main)} + 光錐 ${pct(state.critDamageParts.lightCone)} + 隊伍/校正 ${pct(state.critDamageParts.team)} + 套裝 ${pct(state.critDamageParts.relic)} + 副詞條 ${pct(state.critDamageParts.rolls)} = ${pct(state.critDamage)}`,
    `增傷% = 主詞條 ${pct(state.dmgParts.main)} + 隊伍/校正 ${pct(state.dmgParts.team)} + 行跡冰傷 ${pct(state.dmgParts.trace)} + 光錐 ${pct(state.dmgParts.lightCone)} + 套裝基礎 ${pct(state.dmgParts.relicBase)} + 套裝技能 ${pct(state.dmgParts.relicSkill)} + 套裝終結技 ${pct(state.dmgParts.relicUltimate)} + 終結技後下次戰技 ${pct(state.dmgParts.relicAfterUltimateSkill)} + 繁星條件 ${pct(state.dmgParts.relicConditional)} + 42 層行跡 ${pct(result.traceDmg)} = ${pct(state.dmgBonus + result.traceDmg)}`,
    "",
    "大黑塔特殊機制",
    `解讀層數倍率 = 主目標每層 +${interpretationMainPerStack}% / 其他目標每層 +${interpretationAdjacentPerStack}%（2 智識：${state.twoErudition ? "已啟用" : "未啟用"}；一魂倍率：${state.hertaE1 ? "已啟用 x1.5" : "未啟用"}）`,
    `解讀列代入 = ${state.interpretationStacks} 層 x 主目標 ${interpretationMainPerStack}% x ${interpretationEidolonMult}；其他目標 ${state.interpretationStacks} 層 x ${interpretationAdjacentPerStack}% x ${interpretationEidolonMult}`,
    riddleDetail,
    `大黑塔終結技後攻擊 Buff = ${state.atkParts.ultimate ? "已啟用" : "未啟用"}，${pct(state.atkParts.ultimate)}`,
    "6 魂終結技額外倍率 = V1 未套用",
    "",
    "乘區",
    `增傷乘區 = 1 + ${pct(state.dmgBonus + result.traceDmg)} = ${dec(result.dmgBoost)}`,
    `42 層強化戰技增傷 = ${state.skill.enhanced && state.fullInterpretationTrace && state.interpretationStacks >= 42 ? "已啟用" : "未啟用"}，${pct(result.traceDmg)}`,
    `防禦乘區 = (${state.characterLevel} + 20) / ((${state.enemyLevel} + 20) x (1 - ${pct(multipliers.defReductionTotal)}) + ${state.characterLevel} + 20) = ${dec(multipliers.defMult)}`,
    `抗性乘區 = 1 - (敵人抗性 - 特殊抗性穿透) = 1 - (${pct(state.enemyRes)} - ${pct(state.resPen)}) = ${dec(multipliers.resMult)}`,
    `易傷乘區 = 1 + ${pct(state.vulnerability)} = ${dec(multipliers.vulnMult)}`,
    `造成傷害降低乘區 = 1 - ${pct(state.weaken)} = ${dec(multipliers.weakenMult)}`,
    `減傷乘區 = 1 - ${pct(state.mitigation)} = ${dec(multipliers.mitigationMult)}`,
    `破韌乘區 = ${state.targetBroken ? "已破韌" : "未破韌"} = ${dec(multipliers.brokenMult)}`,
    `總乘區 = ${dec(result.common)}`,
    `暴擊乘區 = 1 + ${pct(state.critDamage)} = ${dec(result.critMult)}`,
    `期望暴擊乘區 = 1 + ${pct(state.critRate)} x ${pct(state.critDamage)} = ${dec(result.expectedCritMult)}`,
    "",
    "乘區摘要",
    ...result.factorSummary.map((factor) => `${factor.label} = ${dec(factor.value)} (${factor.formula}${factor.detail ? `，${factor.detail}` : ""})`),
    "",
    "分段 Hit",
    `目標總倍率分布 = ${result.targetDistribution.map((item) => `${item.label} ${pct(item.multiplier)}`).join(" / ")}`,
    ...result.hits.flatMap((hit, index) => [
      `${index + 1}. ${hit.label}`,
      `   基礎 = ${state.finalAtk.toFixed(1)} x ${pct(hit.ability)} x ${hit.targets} x ${hit.repeats} = ${hit.base.toFixed(1)}`,
      `   非暴擊 = ${hit.base.toFixed(1)} x ${dec(result.common)} = ${hit.normal.toFixed(1)}`,
      `   暴擊 = ${hit.normal.toFixed(1)} x ${dec(result.critMult)} = ${hit.crit.toFixed(1)}`,
      `   期望 = ${hit.normal.toFixed(1)} x ${dec(result.expectedCritMult)} = ${hit.expected.toFixed(1)}`,
    ]),
    "",
    `總非暴擊 = ${result.normal.toFixed(1)}`,
    `總暴擊 = ${result.crit.toFixed(1)}`,
    `總期望 = ${result.expected.toFixed(1)}`,
  ];
  return lines.join("\n");
}
