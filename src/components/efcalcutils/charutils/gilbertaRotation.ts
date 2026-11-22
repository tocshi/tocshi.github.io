import type { RotationPolicy } from "../utils/simulation";

export const gilbertaRotation: RotationPolicy = ({
    sp,
    legalActions,
    nextBasicSequence,
    enemyStagger,
    maxStagger,
    staggered,
    ultimateEnergyCost,
    battleSkillEnergyGain,
    ultimateStagger,
    staggerGainMultiplier,
    staggeredUltimateDives,
}) => {
    const basic = `basic-${nextBasicSequence}`;
    const staggerRemaining = (maxStagger ?? Infinity) - enemyStagger;
    const FINAL_STRIKE_STAGGER = 16;
    const BATTLE_SKILL_STAGGER = 10;

    if (staggered) {
        if (legalActions.includes("ultimate")) return "ultimate";
        if (legalActions.includes("finisher")) return "finisher";
    }

    if (staggeredUltimateDives !== undefined && staggeredUltimateDives < 2 && legalActions.includes("dive")) {
        return "dive";
    }

    if (!staggered && staggerRemaining > 0 && staggerRemaining <= BATTLE_SKILL_STAGGER) {
        if (legalActions.includes("battle")) return "battle";
        if (nextBasicSequence <= 3 && legalActions.includes(basic)) return basic;
        if (legalActions.includes("dive")) return "dive";
    }

    if (
        !staggered &&
        sp >= 100 &&
        staggerRemaining > FINAL_STRIKE_STAGGER &&
        staggerRemaining < FINAL_STRIKE_STAGGER * 2 &&
        staggerRemaining % FINAL_STRIKE_STAGGER <= BATTLE_SKILL_STAGGER
    ) {
        if (legalActions.includes(basic)) return basic;
    }

    const priority = ["combo", "ultimate", "finisher", "battle", basic, "dive"];
    // Budget two Final Strikes per Battle Skill, plus the stagger from the current Ultimate.
    const staggerPerBattleSkill = (2 * FINAL_STRIKE_STAGGER + BATTLE_SKILL_STAGGER) * staggerGainMultiplier;
    const staggerToRecharge =
        battleSkillEnergyGain > 0
            ? staggerPerBattleSkill * Math.ceil(ultimateEnergyCost / battleSkillEnergyGain)
            : Infinity;
    const canRechargeBeforeStagger = staggerRemaining - ultimateStagger >= staggerToRecharge;
    const useUltimate = staggered || !maxStagger || canRechargeBeforeStagger;
    return priority.find((action) => legalActions.includes(action) && (action !== "ultimate" || useUltimate)) ?? null;
};
