import type { CharacterAttack, CharacterCombatStats, Enemy } from "../EFCalcUtils";

export const damageElementFields = {
    Physical: { bonus: "dmgBonusPhysical", resistance: "resistancePhysical" },
    Heat: { bonus: "dmgBonusHeat", resistance: "resistanceHeat" },
    Electric: { bonus: "dmgBonusElectric", resistance: "resistanceElectric" },
    Cryo: { bonus: "dmgBonusCryo", resistance: "resistanceCryo" },
    Nature: { bonus: "dmgBonusNature", resistance: "resistanceNature" },
} as const;
export type DamageElement = keyof typeof damageElementFields;

const attackTypeBonus = {
    basic: "dmgBonusBasicAttack",
    dive: "dmgBonusBasicAttack",
    finisher: "dmgBonusBasicAttack",
    battle: "dmgBonusBattleSkill",
    combo: "dmgBonusComboSkill",
    ultimate: "dmgBonusUltimateSkill",
} as const;
export type AttackType = keyof typeof attackTypeBonus;

interface PercentModifier {
    label: string;
    percent: number;
}

export interface DamageContext {
    staggered: boolean;
    artsSusceptibility?: number;
    attackBonus?: PercentModifier & { amount: number };
    artsDamageBonuses?: readonly PercentModifier[];
    artsDamageTaken?: PercentModifier;
    resistanceReduction?: number;
    status?: { operatorLevel: number; artsIntensity: number };
    critical?: { rate: number; bonus: number; mode: "rolled" | "aggregate"; roll?: number };
}

type DamageHit = Pick<CharacterAttack, "multiplier" | "hitCount" | "perHitMultiplier" | "potentialDamageMultiplier">;
export type DamageStats = Pick<
    CharacterCombatStats,
    | "atk"
    | "dmgBonusStagger"
    | (typeof damageElementFields)[DamageElement]["bonus"]
    | (typeof attackTypeBonus)[AttackType]
>;

export function getPerHitMultiplier(attack: DamageHit, potential: number) {
    const bonus = attack.potentialDamageMultiplier;
    return {
        perHitMultiplier: attack.perHitMultiplier ?? attack.multiplier / attack.hitCount,
        potentialMultiplier: bonus && potential >= bonus.level ? bonus.multiplier : 1,
    };
}

export function calculateDamageBreakdown(
    attack: DamageHit,
    type: AttackType | "status",
    element: DamageElement,
    stats: DamageStats,
    enemy: Enemy,
    potential: number,
    context: DamageContext = { staggered: type === "finisher" },
) {
    const fields = damageElementFields[element];
    const skillBonus = type === "status" ? 0 : stats[attackTypeBonus[type]];
    const staggerBonus = context.staggered ? stats.dmgBonusStagger : 0;
    const elementBonus = stats[fields.bonus];
    const artsDamageBonuses = element === "Physical" ? [] : (context.artsDamageBonuses ?? []);
    const artsDamageBonusPercent = artsDamageBonuses.reduce((total, { percent }) => total + percent, 0);
    const damageBonus = 1 + (elementBonus + skillBonus + staggerBonus + artsDamageBonusPercent) / 100;
    const { perHitMultiplier, potentialMultiplier } = getPerHitMultiplier(attack, potential);
    const totalAttack = stats.atk + (context.attackBonus?.amount ?? 0);
    const baseDamage = totalAttack * (perHitMultiplier / 100);
    const defense = enemy.def >= 0 ? 100 / (100 + enemy.def) : 2 - 0.99 ** -enemy.def;
    const baseResistance = enemy[fields.resistance];
    const resistanceReduction = context.resistanceReduction ?? 0;
    const resistance = Math.max(0, 1 - (baseResistance - resistanceReduction) / 100);
    const stagger = context.staggered ? 1.3 : 1;
    const finisher = type === "finisher" ? (enemy.finisherMultiplier ?? 1) : 1;
    const susceptibilityBonus = element === "Physical" ? 0 : (context.artsSusceptibility ?? 0);
    const susceptibility = 1 + susceptibilityBonus / 100;
    const artsDamageTaken = element === "Physical" ? undefined : context.artsDamageTaken;
    const damageTaken = 1 + (artsDamageTaken?.percent ?? 0) / 100;
    const status = type === "status" ? context.status : undefined;
    const levelCoefficient = status ? 1 + (status.operatorLevel - 1) / (element === "Physical" ? 392 : 196) : 1;
    const artsIntensityMultiplier = status ? 1 + status.artsIntensity / 100 : 1;

    const nonCritDamage = Math.max(
        0,
        baseDamage *
            potentialMultiplier *
            damageBonus *
            defense *
            resistance *
            stagger *
            finisher *
            susceptibility *
            damageTaken *
            levelCoefficient *
            artsIntensityMultiplier,
    );
    const critRate = Math.min(100, Math.max(0, context.critical?.rate ?? 0));
    const critBonus = Math.max(0, context.critical?.bonus ?? 0);
    const critFactor = 1 + critBonus / 100;
    const expectedFactor = 1 + (critRate / 100) * (critBonus / 100);
    const didCrit = context.critical?.mode === "rolled" && (context.critical.roll ?? 1) < critRate / 100;
    const appliedFactor = context.critical?.mode === "aggregate" ? expectedFactor : didCrit ? critFactor : 1;

    return {
        target: enemy.name,
        element,
        damage: nonCritDamage * appliedFactor,
        critical: context.critical && {
            mode: context.critical.mode,
            rate: critRate,
            bonus: critBonus,
            didCrit,
            appliedFactor,
            nonCritDamage,
            critDamage: nonCritDamage * critFactor,
            expectedDamage: nonCritDamage * expectedFactor,
        },
        attack: totalAttack,
        attackBonus: context.attackBonus,
        perHitMultiplier,
        baseDamage,
        elementBonus,
        skillBonus,
        staggerBonus,
        artsDamageBonuses,
        damageBonus,
        susceptibilityBonus,
        susceptibility,
        artsDamageTaken,
        damageTaken,
        targetDefense: enemy.def,
        defense,
        baseResistance,
        resistanceReduction,
        resistance,
        stagger,
        finisher,
        potentialMultiplier,
        status: status && { ...status, levelCoefficient, artsIntensityMultiplier },
    };
}

export type DamageBreakdown = ReturnType<typeof calculateDamageBreakdown>;

export function calculateNonCritDamage(...args: Parameters<typeof calculateDamageBreakdown>): number {
    return calculateDamageBreakdown(...args).damage;
}
