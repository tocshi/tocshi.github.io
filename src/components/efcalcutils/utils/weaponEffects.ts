import type { DamageContext } from "./combatDamage";

export interface WeaponConditionalEffects {
    debilitatingAssault?: {
        atk: number;
        dmgBonusArts: number;
        artsDamageTakenPercent: number;
    };
    hunterInstinct?: {
        artsIntensity: number;
        dmgBonusArtsPerStack: number;
    };
}

export interface SimulationWeapon {
    effects: WeaponConditionalEffects;
    intellectAtLeastWill: boolean;
    attributeScaledBaseAttack: number;
}

const debilitatingAssault = "Debilitating Assault";
const hunterInstinct = "Hunter Instinct";
const windformMaxStacks = 4;

export function createWeaponEffects(
    weapon: SimulationWeapon,
    toFrames: (seconds: number) => number,
    log: (event: string) => void,
) {
    const assault = weapon.effects.debilitatingAssault;
    const hunter = weapon.effects.hunterInstinct;
    const attack = { label: debilitatingAssault, percent: assault?.atk ?? 0 };
    const artsDamage = { label: debilitatingAssault, percent: assault?.dmgBonusArts ?? 0 };
    const artsDamageTaken = { label: debilitatingAssault, percent: assault?.artsDamageTakenPercent ?? 0 };
    const deadlines = new Map<string, number>();
    const attackEffect = `${debilitatingAssault} (ATK)`;
    const artsDamageEffect = `${debilitatingAssault} (Arts DMG Dealt)`;
    const artsDamageTakenEffect = `${debilitatingAssault} (Arts DMG Taken)`;
    const hunterDamageEnds: number[] = [];
    let windformStacks = 0;
    let nextWindformProc = 0;

    const activate = (effect: string, frame: number, seconds: number) => {
        log(`${effect} ${deadlines.has(effect) ? "refreshed" : "activated"}`);
        deadlines.set(effect, frame + toFrames(seconds));
    };

    return {
        onBattleCast(frame: number) {
            if (!hunter) return;
            windformStacks = windformMaxStacks;
            activate("Windform", frame, 15);
        },
        onInfliction(frame: number) {
            if (assault && weapon.intellectAtLeastWill) activate(artsDamageEffect, frame, 20);
        },
        onBurstApplied(frame: number) {
            if (assault && !weapon.intellectAtLeastWill) activate(artsDamageTakenEffect, frame, 25);
            if (!hunter || !deadlines.has("Windform") || windformStacks === 0 || frame < nextWindformProc) return;
            windformStacks -= 1;
            nextWindformProc = frame + toFrames(0.1);
            // At the cap, replace the oldest stack and leave the other timers alone.
            if (hunterDamageEnds.length === windformMaxStacks) hunterDamageEnds.shift();
            hunterDamageEnds.push(frame + toFrames(30));
            log(`Windform consumed (${windformStacks} remaining) · ${hunterInstinct} (${hunterDamageEnds.length} stacks)`);
        },
        onSusceptibility(frame: number) {
            if (!assault) return;
            if (weapon.intellectAtLeastWill) activate(attackEffect, frame, 20);
            else activate(artsDamageTakenEffect, frame, 25);
        },
        expire(frame: number) {
            deadlines.forEach((end, effect) => {
                if (frame < end) return;
                deadlines.delete(effect);
                if (effect === "Windform") windformStacks = 0;
                log(`${effect} expired`);
            });
            while (hunterDamageEnds.length && hunterDamageEnds[0] <= frame) {
                hunterDamageEnds.shift();
                log(`${hunterInstinct} stack expired (${hunterDamageEnds.length} remaining)`);
            }
        },
        get nextExpiry() {
            return Math.min(hunterDamageEnds[0] ?? Infinity, ...Array.from(deadlines.values()));
        },
        get artsIntensity() {
            return deadlines.has("Windform") ? (hunter?.artsIntensity ?? 0) : 0;
        },
        get attackBonus(): DamageContext["attackBonus"] {
            return deadlines.has(attackEffect)
                ? { ...attack, amount: weapon.attributeScaledBaseAttack * attack.percent / 100 }
                : undefined;
        },
        get artsDamageBonus() {
            if (deadlines.has(artsDamageEffect)) return artsDamage;
            if (hunter && hunterDamageEnds.length) {
                return { label: hunterInstinct, percent: hunter.dmgBonusArtsPerStack * hunterDamageEnds.length };
            }
            return undefined;
        },
        get artsDamageTaken() {
            return deadlines.has(artsDamageTakenEffect) ? artsDamageTaken : undefined;
        },
    };
}
