import { calculateDamageBreakdown, getPerHitMultiplier } from "./combatDamage";
import type { AttackType, DamageBreakdown, DamageElement, DamageStats } from "./combatDamage";
import type { CharacterAttack, CharacterCombatStats, Enemy } from "../EFCalcUtils";
import { createWeaponEffects } from "./weaponEffects";
import type { SimulationWeapon } from "./weaponEffects";

export const framesPerSecond = 60;
export const baseSPPerSecond = 8;
export const maxSP = 300;
export const toFrames = (seconds: number) => Math.round(seconds * framesPerSecond);

export interface SimulationHit {
    frame: number;
    attack: CharacterAttack;
    label?: string;
    stagger: number;
    spGain?: number;
    energyGain?: number;
    appliesNature?: boolean;
    appliesLift?: boolean;
    appliesGravityField?: boolean;
}

export interface SimulationAction {
    id: string;
    label: string;
    type: AttackType;
    recoveryFrames: number;
    hits: readonly SimulationHit[];
    spCost?: number;
    energyCost?: number;
    energyOnCast?: number;
    cooldownFrames?: number;
    effectPauseFrames?: number;
    estimatedTiming?: boolean;
}

interface RotationState {
    frame: number;
    sp: number;
    ultimateEnergy: number;
    ultimateEnergyCost: number;
    battleSkillEnergyGain: number;
    ultimateStagger: number;
    staggerGainMultiplier: number;
    staggeredUltimateDives?: number;
    enemyHP: number;
    enemyStagger: number;
    maxStagger: number;
    staggered: boolean;
    nextBasicSequence: number;
    legalActions: readonly string[];
}

export type RotationPolicy = (state: Readonly<RotationState>) => string | { waitUntilFrame: number } | null;

export interface SimulationInput {
    actions: readonly SimulationAction[];
    policy: RotationPolicy;
    enemy: Enemy;
    stats: DamageStats &
        Pick<
            CharacterCombatStats,
            "ultimateGainEfficiency" | "staggerEfficiencyBonus" | "artsIntensity" | "critRate" | "critDamage"
        >;
    element: DamageElement;
    operatorLevel: number;
    potential: number;
    durationFrames: number;
    startingSP: number;
    startingEnergy: number;
    spPerSecond: number;
    aggregateCriticalHits?: boolean;
    tideSurgeActive?: boolean;
    weapon?: SimulationWeapon;
    random?: () => number;
    initialInfliction?: { element: Exclude<DamageElement, "Physical">; stacks: number };
}

interface SimulationEvent {
    frame: number;
    event: string;
    damage?: number;
    damageBreakdown?: DamageBreakdown;
    kind?: "passiveSP";
    sp: number;
    ultimateEnergy: number;
    enemyStagger: number;
}

export interface SimulationResult {
    elapsedFrames: number;
    totalDamage: number;
    remainingHP: number;
    events: SimulationEvent[];
    actionCounts: { id: string; label: string; count: number }[];
    hitCounts: HitCount[];
    usedEstimatedTiming: boolean;
    maxStagger?: number;
}

interface HitCount {
    id: string;
    label: string;
    multiplier: number;
    count: number;
    criticalCount: number;
}

interface HitSource {
    id: string;
    type: AttackType | "status";
    label: string;
}

interface ScheduledHit {
    frame: number;
    action: SimulationAction;
    hit: SimulationHit;
}

const inflictionDuration = toFrames(20);
const artsBurstDelay = 60;
const tideSurgeDuration = toFrames(15);
const tideSurgeBonus = { label: "Tide Surge", percent: 35 };
const comboWindow = toFrames(4); // Preview assumption until measured in-game.

export function simulateSolo(input: SimulationInput): SimulationResult {
    const { actions, enemy, stats, potential, durationFrames } = input;
    const random = input.random ?? Math.random;
    const ultimate = actions.find(({ type }) => type === "ultimate");
    const energyCapacity = ultimate?.energyCost ?? 0;
    const energyGainMultiplier = Math.max(0, 1 + stats.ultimateGainEfficiency / 100);
    const staggerGainMultiplier = Math.max(0, 1 + stats.staggerEfficiencyBonus / 100);
    const battleSkill = actions.find(({ type }) => type === "battle");
    const battleSkillEnergyGain = (battleSkill?.energyOnCast ?? 0) * energyGainMultiplier;
    const ultimateStagger = (ultimate?.hits.reduce((sum, hit) => sum + hit.stagger, 0) ?? 0) * staggerGainMultiplier;
    if (
        !Number.isInteger(durationFrames) ||
        durationFrames < 1 ||
        !Number.isFinite(enemy.hp) ||
        !Number.isFinite(input.startingSP) ||
        input.startingSP < 0 ||
        input.startingSP > maxSP ||
        !Number.isFinite(input.startingEnergy) ||
        input.startingEnergy < 0 ||
        input.startingEnergy > energyCapacity ||
        !Number.isFinite(input.spPerSecond) ||
        input.spPerSecond < 0
    ) {
        throw new Error("The simulation inputs are out of range.");
    }
    if (
        actions.some(
            ({ recoveryFrames, effectPauseFrames = 0, hits }) =>
                !Number.isInteger(recoveryFrames) ||
                recoveryFrames < 1 ||
                !Number.isInteger(effectPauseFrames) ||
                effectPauseFrames < 0 ||
                hits.some(({ frame }) => !Number.isInteger(frame) || frame < 0),
        )
    ) {
        throw new Error("Action recovery and hit timings must use whole frames.");
    }
    const basicCount = actions.filter(({ type }) => type === "basic").length;
    const events: SimulationEvent[] = [];
    const pendingHits: ScheduledHit[] = [];
    const pendingBursts: number[] = [];
    const cooldowns = new Map<string, number>();
    const actionUses = new Map<string, number>();
    const hitCounts = new Map<string, HitCount>();
    const getHitCount = (source: HitSource, multiplier: number, hitLabel?: string) => {
        const id = `${source.id}:${multiplier}`;
        const existing = hitCounts.get(id);
        if (existing) return existing;

        const entry = {
            id,
            label: hitLabel ? `${source.label} · ${hitLabel}` : source.label,
            multiplier,
            count: 0,
            criticalCount: 0,
        };
        hitCounts.set(id, entry);
        return entry;
    };
    for (const action of actions) {
        for (const hit of action.hits) {
            const { perHitMultiplier, potentialMultiplier } = getPerHitMultiplier(hit.attack, potential);
            getHitCount(action, perHitMultiplier * potentialMultiplier, hit.label);
        }
    }
    let frame = 0;
    let effectFrame = 0;
    let effectsPausedUntil = 0;
    let recoveryEnds = 0;
    let comboExpires = 0;
    let staggerEnds = 0;
    let gravityFieldEnds = 0;
    let divesSinceStaggeredUltimate: number | undefined;
    let tideSurgeEnds = 0;
    let lastTideSurgeInfliction = -Infinity;
    let vulnerabilityEnds = 0;
    let vulnerableStacks = 0;
    let finisherAvailable = false;
    let enemyStagger = 0;
    let nextBasicSequence = 1;
    let sp = input.startingSP;
    let ultimateEnergy = input.startingEnergy;
    let remainingHP = Math.max(0, enemy.hp);
    let totalDamage = 0;
    let usedEstimatedTiming = false;
    let infliction = input.initialInfliction && { ...input.initialInfliction, expires: inflictionDuration };
    let corrosion: { start: number; end: number; level: number } | undefined;

    const log = (event: string, damageBreakdown?: DamageBreakdown, kind?: SimulationEvent["kind"]) =>
        events.push({
            frame,
            event,
            damage: damageBreakdown?.damage,
            damageBreakdown,
            kind,
            sp,
            ultimateEnergy,
            enemyStagger,
        });
    const weaponEffects = input.weapon && createWeaponEffects(input.weapon, toFrames, log);
    const recoverSP = (amount: number, passive = false) => {
        if (amount <= 0 || sp >= maxSP) return;
        const previous = sp;
        sp = Math.min(maxSP, sp + amount);
        const label = passive ? "Passive SP recovered" : "SP recovered";
        log(`${label} (+${Number((sp - previous).toFixed(2))})`, undefined, passive ? "passiveSP" : undefined);
    };
    const gainEnergy = (base: number) => {
        const gain = base * energyGainMultiplier;
        if (gain <= 0 || ultimateEnergy >= energyCapacity) return;
        ultimateEnergy = Math.min(energyCapacity, ultimateEnergy + gain);
        log("Ultimate Energy gained");
    };
    const addStagger = (base: number) => {
        if (base <= 0 || !enemy.staggerThreshold || !enemy.staggerDurationSeconds || frame < staggerEnds) return false;
        const amount = base * staggerGainMultiplier;
        enemyStagger = Math.min(enemy.staggerThreshold, enemyStagger + amount);
        if (enemyStagger < enemy.staggerThreshold) return false;

        staggerEnds = frame + toFrames(enemy.staggerDurationSeconds);
        finisherAvailable = true;
        return true;
    };
    const damageTarget = (
        attack: Pick<CharacterAttack, "multiplier" | "hitCount" | "perHitMultiplier" | "potentialDamageMultiplier">,
        source: HitSource,
        element: DamageElement,
        stagger = 0,
        hitLabel?: string,
    ) => {
        const { type, label: sourceLabel } = source;
        const stacks = effectFrame < vulnerabilityEnds ? vulnerableStacks : 0;
        const susceptibility = potential >= 2 ? 30 + 6 * Math.min(4, stacks + 1) : 30 + 3 * stacks;
        const resistanceReduction =
            corrosion && effectFrame < corrosion.end
                ? Math.min(
                      8 + 4 * corrosion.level,
                      2.4 +
                          1.2 * corrosion.level +
                          (0.56 + 0.28 * corrosion.level) *
                              Math.floor((effectFrame - corrosion.start) / framesPerSecond),
                  )
                : 0;
        const artsDamageBonuses = effectFrame < tideSurgeEnds ? [tideSurgeBonus] : [];
        const weaponArtsBonus = weaponEffects?.artsDamageBonus;
        if (weaponArtsBonus) artsDamageBonuses.push(weaponArtsBonus);
        const breakdown = calculateDamageBreakdown(attack, type, element, stats, enemy, potential, {
            staggered: frame < staggerEnds,
            artsSusceptibility: effectFrame < gravityFieldEnds ? susceptibility : 0,
            attackBonus: weaponEffects?.attackBonus,
            artsDamageBonuses,
            artsDamageTaken: weaponEffects?.artsDamageTaken,
            resistanceReduction,
            status:
                type === "status"
                    ? {
                          operatorLevel: input.operatorLevel,
                          artsIntensity: stats.artsIntensity + (weaponEffects?.artsIntensity ?? 0),
                      }
                    : undefined,
            critical: {
                rate: stats.critRate,
                bonus: stats.critDamage,
                mode: input.aggregateCriticalHits ? "aggregate" : "rolled",
                roll: input.aggregateCriticalHits ? undefined : random(),
            },
        });
        totalDamage += breakdown.damage;
        remainingHP = Math.max(0, remainingHP - breakdown.damage);
        const staggeredTarget = remainingHP > 0 && addStagger(stagger);
        const count = getHitCount(source, breakdown.perHitMultiplier * breakdown.potentialMultiplier, hitLabel);
        count.count += 1;
        if (breakdown.critical?.didCrit) count.criticalCount += 1;
        const label = breakdown.critical?.didCrit
            ? `${sourceLabel} critical hit`
            : type === "status"
              ? sourceLabel
              : `${sourceLabel} hit`;
        log(label, breakdown);
        if (staggeredTarget) log("Target staggered");
    };
    const statusDamage = (multiplier: number, element: DamageElement, label: string, stagger = 0) => {
        damageTarget({ multiplier, hitCount: 1 }, { id: `status-${label}`, type: "status", label }, element, stagger);
    };
    const applyNature = () => {
        if (infliction && infliction.element !== "Nature") {
            const level = infliction.stacks;
            infliction = undefined;
            statusDamage(80 + 80 * level, "Nature", "Corrosion reaction");
            corrosion = { start: effectFrame, end: effectFrame + toFrames(15), level };
            comboExpires = frame + comboWindow;
            log("Combo trigger opened");
            return;
        }
        if (infliction) {
            pendingBursts.push(effectFrame + artsBurstDelay);
            log("Nature Burst applied");
            weaponEffects?.onBurstApplied(effectFrame);
        }
        infliction = {
            element: "Nature",
            stacks: Math.min(4, (infliction?.stacks ?? 0) + 1),
            expires: effectFrame + inflictionDuration,
        };
        log(`Nature Infliction (${infliction.stacks} stacks)`);
        weaponEffects?.onInfliction(effectFrame);
        if (input.tideSurgeActive) {
            if (effectFrame - lastTideSurgeInfliction <= tideSurgeDuration) {
                log(effectFrame < tideSurgeEnds ? "Tide Surge refreshed" : "Tide Surge activated");
                tideSurgeEnds = effectFrame + tideSurgeDuration;
            }
            lastTideSurgeInfliction = effectFrame;
        }
    };
    const resolveHit = ({ action, hit }: ScheduledHit) => {
        damageTarget(hit.attack, action, input.element, hit.stagger, hit.label);
        if (remainingHP === 0) return;
        recoverSP(hit.spGain ?? (action.type === "finisher" ? (enemy.finisherSP ?? 0) : 0));
        gainEnergy(hit.energyGain ?? 0);
        if (hit.appliesNature) applyNature();
        if (remainingHP === 0) return;
        if (hit.appliesGravityField) {
            gravityFieldEnds = effectFrame + toFrames(5);
            log("Arts Susceptibility applied");
            weaponEffects?.onSusceptibility(effectFrame);
        }
        if (hit.appliesLift) {
            if (vulnerableStacks > 0) {
                statusDamage(120, "Physical", "Lift", 10);
            }
            vulnerableStacks = Math.min(4, vulnerableStacks + 1);
            vulnerabilityEnds = effectFrame + toFrames(20);
            log(`Vulnerability (${vulnerableStacks} stacks)`);
        }
    };
    const getLegalActions = () =>
        actions.filter(
            (action) =>
                sp + 1e-9 >= (action.spCost ?? 0) &&
                ultimateEnergy >= (action.energyCost ?? 0) &&
                frame >= (cooldowns.get(action.id) ?? 0) &&
                (action.type !== "finisher" || finisherAvailable) &&
                (action.type !== "combo" || frame < comboExpires) &&
                (action.type !== "basic" || (!finisherAvailable && action.id === `basic-${nextBasicSequence}`)),
        );
    const getNextSPThreshold = () => {
        if (input.spPerSecond === 0) return Infinity;
        let threshold = Infinity;
        for (const { spCost = 0 } of actions) {
            if (spCost <= sp + 1e-9 || spCost > maxSP) continue;
            const framesNeeded = ((spCost - sp) * framesPerSecond) / input.spPerSecond;
            threshold = Math.min(threshold, frame + Math.max(1, Math.ceil(framesNeeded - 1e-9)));
        }
        return threshold;
    };
    // Effect deadlines use the paused clock. Action hits and recovery use the timeline clock.
    const toTimelineFrame = (deadline: number) =>
        deadline > effectFrame ? Math.max(frame, effectsPausedUntil) + (deadline - effectFrame) : Infinity;

    while (remainingHP > 0) {
        if (staggerEnds > 0 && frame >= staggerEnds) {
            enemyStagger = 0;
            staggerEnds = 0;
            finisherAvailable = false;
            log("Stagger expired");
        }
        if (infliction && effectFrame >= infliction.expires) {
            infliction = undefined;
            log("Arts Infliction expired");
        }
        if (corrosion && effectFrame >= corrosion.end) {
            corrosion = undefined;
            log("Corrosion expired");
        }
        if (gravityFieldEnds > 0 && effectFrame >= gravityFieldEnds) {
            gravityFieldEnds = 0;
            log("Arts Susceptibility expired");
        }
        if (tideSurgeEnds > 0 && effectFrame >= tideSurgeEnds) {
            tideSurgeEnds = 0;
            log("Tide Surge expired");
        }
        if (vulnerabilityEnds > 0 && effectFrame >= vulnerabilityEnds) {
            vulnerabilityEnds = 0;
            vulnerableStacks = 0;
            log("Vulnerability expired");
        }
        weaponEffects?.expire(effectFrame);
        while (pendingHits[0]?.frame === frame && remainingHP > 0) resolveHit(pendingHits.shift()!);
        while (pendingBursts[0] === effectFrame && remainingHP > 0) {
            pendingBursts.shift();
            statusDamage(160, "Nature", "Nature Burst");
        }
        if (remainingHP === 0 || frame >= durationFrames) break;

        let policyWake = durationFrames;
        if (frame >= recoveryEnds) {
            const legal = getLegalActions();
            const staggered = frame < staggerEnds;
            const choice = input.policy({
                frame,
                sp,
                ultimateEnergy,
                ultimateEnergyCost: energyCapacity,
                battleSkillEnergyGain,
                ultimateStagger,
                staggerGainMultiplier,
                staggeredUltimateDives: effectFrame < gravityFieldEnds ? divesSinceStaggeredUltimate : undefined,
                enemyHP: remainingHP,
                enemyStagger,
                maxStagger: enemy.staggerThreshold,
                staggered,
                nextBasicSequence,
                legalActions: legal.map(({ id }) => id),
            });
            if (typeof choice === "string") {
                const action = legal.find(({ id }) => id === choice);
                if (!action) throw new Error(`Rotation selected an unavailable action (${choice}).`);
                sp = Math.max(0, sp - (action.spCost ?? 0));
                ultimateEnergy -= action.energyCost ?? 0;
                if (action.type === "ultimate") divesSinceStaggeredUltimate = staggered ? 0 : undefined;
                if (action.type === "dive" && divesSinceStaggeredUltimate !== undefined) divesSinceStaggeredUltimate += 1;
                if (action.type === "finisher") finisherAvailable = false;
                if (action.type === "combo") comboExpires = 0;
                if (action.type === "basic") nextBasicSequence = (nextBasicSequence % basicCount) + 1;
                cooldowns.set(action.id, frame + (action.cooldownFrames ?? 0));
                recoveryEnds = frame + action.recoveryFrames;
                actionUses.set(action.id, (actionUses.get(action.id) ?? 0) + 1);
                usedEstimatedTiming ||= Boolean(action.estimatedTiming);
                log(`${action.label} started`);
                if (action.type === "battle") weaponEffects?.onBattleCast(effectFrame);
                if (action.effectPauseFrames) {
                    effectsPausedUntil = Math.max(effectsPausedUntil, frame + action.effectPauseFrames);
                    log(`Effect timers paused (${action.effectPauseFrames} frames)`);
                }
                gainEnergy(action.energyOnCast ?? 0);
                for (const hit of action.hits) pendingHits.push({ frame: frame + hit.frame, action, hit });
                pendingHits.sort((first, second) => first.frame - second.frame);
                if (pendingHits[0]?.frame === frame) continue;
            } else if (choice && Number.isInteger(choice.waitUntilFrame) && choice.waitUntilFrame > frame) {
                policyWake = choice.waitUntilFrame;
            }
        }

        const upcoming = [
            policyWake,
            recoveryEnds,
            pendingHits[0]?.frame ?? Infinity,
            toTimelineFrame(pendingBursts[0] ?? Infinity),
            getNextSPThreshold(),
            comboExpires,
            staggerEnds,
            toTimelineFrame(gravityFieldEnds),
            toTimelineFrame(tideSurgeEnds),
            toTimelineFrame(weaponEffects?.nextExpiry ?? Infinity),
            toTimelineFrame(vulnerabilityEnds),
            toTimelineFrame(infliction?.expires ?? Infinity),
            toTimelineFrame(corrosion?.end ?? Infinity),
            ...Array.from(cooldowns.values()),
        ];
        let nextFrame = durationFrames;
        for (const candidate of upcoming) {
            if (candidate > frame && candidate < nextFrame) nextFrame = candidate;
        }
        const elapsed = nextFrame - frame;
        effectFrame += Math.max(0, nextFrame - Math.max(frame, effectsPausedUntil));
        frame = nextFrame;
        recoverSP(input.spPerSecond * (elapsed / framesPerSecond), true);
    }

    const actionCounts = actions.map(({ id, label }) => ({ id, label, count: actionUses.get(id) ?? 0 }));
    return {
        elapsedFrames: frame,
        totalDamage,
        remainingHP,
        events,
        actionCounts,
        usedEstimatedTiming,
        maxStagger: enemy.staggerThreshold,
        hitCounts: Array.from(hitCounts.values()),
    };
}
