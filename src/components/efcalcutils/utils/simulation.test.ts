import characters from "../data/characters.json";
import compositions from "../data/enemies.json";
import weapons from "../data/weapons.json";
import type { Character, CharacterCombatStats } from "../EFCalcUtils";
import { gilbertaActions, gilbertaEnergyCost } from "../charutils/gilbertaActions";
import { gilbertaRotation } from "../charutils/gilbertaRotation";
import { simulateSolo, toFrames } from "./simulation";
import type { SimulationInput } from "./simulation";

const character = characters[0] as Character;
const stats = {
    atk: 100,
    critRate: 0,
    critDamage: 50,
    artsIntensity: 0,
    ultimateGainEfficiency: 7,
    staggerEfficiencyBonus: 0,
    comboSkillCooldownReduction: 0,
    dmgBonusPhysical: 0,
    dmgBonusHeat: 0,
    dmgBonusElectric: 0,
    dmgBonusCryo: 0,
    dmgBonusNature: 0,
    dmgBonusBasicAttack: 0,
    dmgBonusBattleSkill: 0,
    dmgBonusComboSkill: 0,
    dmgBonusUltimateSkill: 0,
    dmgBonusStagger: 0,
} satisfies SimulationInput["stats"] & Pick<CharacterCombatStats, "comboSkillCooldownReduction">;

const defaultInput: SimulationInput = {
    actions: gilbertaActions(character, stats, 0),
    policy: gilbertaRotation,
    enemy: compositions[0].enemies[0],
    stats,
    element: "Nature",
    operatorLevel: 90,
    potential: 0,
    durationFrames: toFrames(15),
    startingSP: 200,
    startingEnergy: 0,
    spPerSecond: 0,
};
const longStaggerBar = { ...defaultInput.enemy, staggerThreshold: 600 };
const weaponRun: SimulationInput = {
    ...defaultInput,
    enemy: longStaggerBar,
    startingEnergy: 77,
    tideSurgeActive: true,
    durationFrames: 2450,
    policy: (state) => state.frame < 620 ? gilbertaRotation(state) : null,
};
const phalanx = {
    effects: weapons.find(({ id }) => id === "type-42-solemn-phalanx")!.conditionalEffects!,
    intellectAtLeastWill: true,
    attributeScaledBaseAttack: 80,
};
const umbra = {
    ...phalanx,
    effects: weapons.find(({ id }) => id === "umbra-of-frigid-eventide")!.conditionalEffects!,
};

test("resolves all Gravity Mode hits and waits through full recovery", () => {
    const result = simulateSolo(defaultInput);
    const firstCastHits = result.events.filter(({ event, frame }) => event === "Battle Skill hit" && frame < 246);
    expect(firstCastHits.map(({ frame }) => frame)).toEqual([58, 92, 124, 156, 216]);
    expect(firstCastHits.map(({ damage }) => Math.round((damage ?? 0) * 10) / 10)).toEqual([
        27.5, 27.5, 27.5, 27.5, 65,
    ]);
    expect(result.events.filter(({ event }) => event === "Battle Skill started").map(({ frame }) => frame)).toEqual([
        0, 246,
    ]);
    expect(result.events.find(({ event }) => event === "Nature Burst applied")?.frame).toBe(462);
    expect(result.events.find(({ event }) => event === "Nature Burst")).toMatchObject({
        frame: 522,
        damage: expect.any(Number),
    });
    expect(result.actionCounts.find(({ id }) => id === "battle")?.count).toBe(2);
    expect(result.actionCounts.find(({ id }) => id === "combo")?.count).toBe(0);
    expect(result.events.some(({ event }) => event === "Combo Skill started")).toBe(false);
    expect(result.events.some(({ event, sp }) => event === "SP recovered (+16)" && sp === 16)).toBe(true);
    expect(result.elapsedFrames).toBe(900);
    expect(simulateSolo(defaultInput)).toEqual(result);
});

test("a burst pending beyond the run duration contributes no damage", () => {
    const beforeBurst = simulateSolo({ ...defaultInput, durationFrames: 521 });
    const atBurst = simulateSolo({ ...defaultInput, durationFrames: 522 });

    expect(beforeBurst.events.some(({ event }) => event === "Nature Burst applied")).toBe(true);
    expect(beforeBurst.events.some(({ event }) => event === "Nature Burst")).toBe(false);
    expect(atBurst.totalDamage - beforeBurst.totalDamage).toBeCloseTo(80 * (1 + 89 / 196));
});

test("Tide Surge activates on the second recent infliction, buffs its burst, and expires", () => {
    const input = { ...defaultInput, durationFrames: 1400 };
    const baseline = simulateSolo(input);
    const result = simulateSolo({ ...input, tideSurgeActive: true });
    const eventFrame = (event: string) => result.events.find((entry) => entry.event === event)?.frame;
    expect(eventFrame("Tide Surge activated")).toBe(462);
    expect(eventFrame("Tide Surge expired")).toBe(1362);
    expect(result.events.find(({ frame, event }) => frame === 462 && event === "Battle Skill hit")?.damageBreakdown?.artsDamageBonuses)
        .toEqual([]);
    const burst = result.events.find(({ event }) => event === "Nature Burst");
    expect(burst?.damageBreakdown?.artsDamageBonuses).toEqual([{ label: "Tide Surge", percent: 35 }]);
    expect(burst?.damage).toBeCloseTo(baseline.events.find(({ event }) => event === "Nature Burst")!.damage! * 1.35);
    expect(result.events.find(({ frame, damage }) => frame > 1362 && damage !== undefined)?.damageBreakdown?.artsDamageBonuses)
        .toEqual([]);
});

test("Phalanx's Intellect branch refreshes Arts DMG Dealt and applies ATK after Ultimate hits", () => {
    const { events } = simulateSolo({ ...weaponRun, weapon: phalanx });
    expect(events.find(({ frame, event }) => frame === 216 && event === "Battle Skill hit")?.damageBreakdown?.damageBonus)
        .toBe(1);
    expect(events.find(({ frame, event }) => frame === 304 && event === "Battle Skill hit")?.damageBreakdown?.damageBonus)
        .toBe(1.32);
    expect(events.find(({ event }) => event === "Ultimate hit")?.damageBreakdown?.attack).toBe(100);
    const bursts = events.filter(({ event }) => event === "Nature Burst");
    expect(bursts.map(({ damageBreakdown }) => damageBreakdown?.damageBonus)).toEqual([1.67, 1.67]);
    expect(bursts.map(({ damageBreakdown }) => damageBreakdown?.attack)).toEqual([125.6, 125.6]);
    expect(events).toContainEqual(expect.objectContaining({ frame: 1812, event: "Debilitating Assault (ATK) expired" }));
    expect(events).toContainEqual(expect.objectContaining({ frame: 1812, event: "Debilitating Assault (Arts DMG Dealt) expired" }));
});

test("Phalanx's Will branch refreshes one Arts DMG Taken multiplier on both triggers", () => {
    const { events } = simulateSolo({ ...weaponRun, weapon: { ...phalanx, intellectAtLeastWill: false } });
    const triggers = events.filter(({ event }) => event.startsWith("Debilitating Assault"));
    expect(triggers.map(({ frame }) => frame)).toEqual([462, 612, 612, 2112]);
    expect(triggers.map(({ event }) => event.split(" ").pop())).toEqual(["activated", "refreshed", "refreshed", "expired"]);
    const burst = events.find(({ event }) => event === "Nature Burst")?.damageBreakdown;
    expect(burst).toMatchObject({ attack: 100, damageBonus: 1.35, susceptibility: 1.3, damageTaken: 1.096 });
    expect(burst?.damage).toBeCloseTo(80 * (1 + 89 / 196) * 1.35 * 1.3 * 1.096);
});

test("Umbra supplies Arts Intensity on Battle Skill cast and independently timed damage stacks on Burst application", () => {
    const { events } = simulateSolo({ ...weaponRun, weapon: umbra });
    expect(events.filter(({ event }) => /^Windform (activated|refreshed|expired)/.test(event)).map(({ frame }) => frame))
        .toEqual([0, 246, 1250]);
    expect(events.filter(({ event }) => event.startsWith("Windform consumed")).map(({ frame }) => frame)).toEqual([462, 612]);
    const bursts = events.filter(({ event }) => event === "Nature Burst");
    expect(bursts.map(({ damageBreakdown }) => damageBreakdown?.status?.artsIntensity)).toEqual([56, 56]);
    expect(bursts.map(({ damageBreakdown }) => damageBreakdown?.damageBonus)).toEqual([1.478, 1.478]);
    expect(events.filter(({ event }) => event.startsWith("Hunter Instinct stack expired")).map(({ frame }) => frame))
        .toEqual([2366, 2412]);
});

test("Umbra consumes Windform at most once per six frames, and caps its Arts DMG stacks at four", () => {
    const battle = defaultInput.actions.find(({ type }) => type === "battle")!;
    const infliction = battle.hits.find(({ appliesNature }) => appliesNature)!;
    const actions = [{
        ...battle,
        recoveryFrames: 100,
        hits: [0, 1, 2, 7, 13, 19, 25].map((frame) => ({ ...infliction, frame })),
    }];
    const { events } = simulateSolo({
        ...defaultInput,
        actions,
        weapon: umbra,
        durationFrames: 1920,
        policy: ({ legalActions }) => legalActions.includes("battle") ? "battle" : null,
    });
    expect(events.filter(({ event }) => event.startsWith("Windform consumed")).map(({ frame }) => frame))
        .toEqual([1, 7, 13, 19, 100, 107, 113, 119]);
    for (const { damageBreakdown } of events.filter(({ event }) => event === "Nature Burst")) {
        expect(damageBreakdown?.damageBonus).toBe(1.256);
    }
    expect(events.filter(({ event }) => event.startsWith("Hunter Instinct stack expired")).map(({ frame }) => frame))
        .toEqual([1900, 1907, 1913, 1919]);
});

test("Tide Surge ignores inflictions more than 15 seconds apart", () => {
    const result = simulateSolo({
        ...defaultInput,
        tideSurgeActive: true,
        durationFrames: 1200,
        policy: ({ frame }) => frame === 0 || frame === 901 ? "battle" : { waitUntilFrame: 901 },
    });
    expect(result.events.filter(({ event }) => event.startsWith("Nature Infliction"))).toHaveLength(2);
    expect(result.events.some(({ event }) => event === "Tide Surge activated")).toBe(false);
});

test("Ultimate pauses Tide Surge and another qualifying infliction refreshes it without stacking", () => {
    const result = simulateSolo({
        ...defaultInput, enemy: longStaggerBar, tideSurgeActive: true, startingEnergy: 77, durationFrames: 1600,
    });
    expect(result.events.find(({ event }) => event === "Tide Surge refreshed")?.frame).toBe(612);
    expect(result.events.find(({ event }) => event === "Tide Surge expired")?.frame).toBe(1512);
    expect(result.events.filter(({ event }) => event === "Nature Burst").map(({ damageBreakdown }) => damageBreakdown?.damageBonus))
        .toEqual([1.35, 1.35]);
});

test("Ultimate pauses a pending burst so both bursts benefit from its susceptibility", () => {
    const result = simulateSolo({ ...defaultInput, enemy: longStaggerBar, startingEnergy: 77 });
    expect(result.events.find(({ event }) => event === "Ultimate started")?.frame).toBe(492);
    expect(result.events).toContainEqual(
        expect.objectContaining({ frame: 492, event: "Effect timers paused (104 frames)" }),
    );
    expect(result.events.find(({ event }) => event === "Arts Susceptibility applied")?.frame).toBe(612);
    expect(result.events.filter(({ event }) => event === "Nature Burst applied").map(({ frame }) => frame)).toEqual([
        462, 612,
    ]);

    const bursts = result.events.filter(({ event }) => event === "Nature Burst");
    expect(bursts.map(({ frame }) => frame)).toEqual([626, 672]);
    bursts.forEach(({ damage, damageBreakdown }) => {
        expect(damage).toBeCloseTo(80 * (1 + 89 / 196) * 1.3);
        expect(damageBreakdown).toMatchObject({
            damage,
            perHitMultiplier: 160,
            baseDamage: 160,
            susceptibility: 1.3,
            defense: 0.5,
            status: { operatorLevel: 90, levelCoefficient: 1 + 89 / 196, artsIntensityMultiplier: 1 },
        });
    });
});

test("Ultimate extends an existing debuff's expiration without moving the Ultimate hit", () => {
    const result = simulateSolo({
        ...defaultInput,
        startingEnergy: 90,
        durationFrames: 1400,
        initialInfliction: { element: "Nature", stacks: 1 },
        policy: ({ frame, legalActions }) => {
            if (frame < 1190) return { waitUntilFrame: 1190 };
            return legalActions.includes("ultimate") ? "ultimate" : null;
        },
    });
    expect(result.events.find(({ event }) => event === "Arts Infliction expired")?.frame).toBe(1304);
    expect(result.events.find(({ event }) => event === "Ultimate hit")?.frame).toBe(1310);
});

test("uses the configured resources when choosing the opening action", () => {
    const basic = simulateSolo({ ...defaultInput, startingSP: 0, durationFrames: 30 });
    expect(basic.events[0].event).toBe("Basic Attack 1 started");
    const threshold = simulateSolo({
        ...defaultInput,
        startingSP: 99,
        spPerSecond: 10,
        policy: ({ legalActions }) => (legalActions.includes("battle") ? "battle" : null),
        durationFrames: 30,
    });
    expect(threshold.events.find(({ event }) => event === "Battle Skill started")?.frame).toBe(6);

    const ultimate = simulateSolo({ ...defaultInput, enemy: longStaggerBar, startingEnergy: 90 });
    expect(ultimate.events[0]).toMatchObject({ frame: 0, event: "Ultimate started", ultimateEnergy: 0 });
    expect(ultimate.events.find(({ event }) => event === "Arts Susceptibility applied")?.frame).toBe(120);
    expect(ultimate.events.find(({ event }) => event === "Arts Susceptibility expired")?.frame).toBe(420);
    expect(() => simulateSolo({ ...defaultInput, startingSP: 0, policy: () => "battle" })).toThrow(
        "unavailable action",
    );
});

test("budgets stagger to recharge Ultimate using effective energy gain and Potential 4 cost", () => {
    const enemy = { ...defaultInput.enemy, staggerThreshold: 500 };
    const normal = simulateSolo({ ...defaultInput, enemy, startingEnergy: 90, durationFrames: 30 });
    expect(normal.events[0].event).toBe("Battle Skill started");

    const potentialFour = simulateSolo({
        ...defaultInput,
        enemy,
        actions: gilbertaActions(character, stats, 4),
        potential: 4,
        startingEnergy: gilbertaEnergyCost(character, 4),
        durationFrames: 30,
    });
    expect(potentialFour.events[0].event).toBe("Ultimate started");

    const moreEnergyGain = { ...stats, ultimateGainEfficiency: 30 };
    const boosted = simulateSolo({ ...defaultInput, enemy, stats: moreEnergyGain, startingEnergy: 90, durationFrames: 30 });
    expect(boosted.events[0].event).toBe("Ultimate started");

    const partlyStaggered = simulateSolo({
        ...defaultInput,
        enemy: { ...enemy, staggerThreshold: 490 },
        stats: moreEnergyGain,
        startingEnergy: 90,
        durationFrames: 250,
        policy: (state) => state.frame === 0 ? "battle" : gilbertaRotation(state),
    });
    expect(partlyStaggered.events).toContainEqual(
        expect.objectContaining({ frame: 246, event: "Battle Skill started", enemyStagger: 10 }),
    );
});

test("holds Ultimate until stagger and fits Finisher and two dives during Arts Susceptibility", () => {
    const result = simulateSolo({
        ...defaultInput,
        enemy: { ...defaultInput.enemy, staggerThreshold: 10 },
        startingSP: 100,
        startingEnergy: 90,
        durationFrames: 590,
    });
    expect(result.events.filter(({ event }) => event.endsWith("started")).map(({ event }) => event)).toEqual([
        "Battle Skill started", "Ultimate started", "Finisher started", "Dive Attack started", "Dive Attack started",
    ]);
    const dives = result.events.filter(({ event }) => event === "Dive Attack hit");
    expect(dives.map(({ frame }) => frame)).toEqual([500, 572]);
    expect(dives.map(({ damageBreakdown }) => damageBreakdown?.susceptibility)).toEqual([1.3, 1.3]);
});

test("a genuine Arts Reaction opens a combo, while neutral runs start with no trigger", () => {
    const result = simulateSolo({ ...defaultInput, initialInfliction: { element: "Electric", stacks: 1 } });
    expect(result.events.find(({ event }) => event === "Corrosion reaction")?.frame).toBe(216);
    expect(result.events.find(({ event }) => event === "Combo Skill started")?.frame).toBe(246);
    expect(result.events.find(({ event }) => event === "Combo Skill hit")?.frame).toBe(342);
});

test("stagger opens one finisher and a lethal hit stops the simulation", () => {
    const result = simulateSolo({
        ...defaultInput,
        startingSP: 0,
        enemy: { ...defaultInput.enemy, staggerThreshold: 12 },
    });
    const stagger = result.events.find(({ event }) => event === "Target staggered");
    expect(stagger?.frame).toBe(186);
    expect(stagger?.enemyStagger).toBe(12);
    expect(result.maxStagger).toBe(12);
    expect(result.events.find(({ frame, damage }) => frame === 186 && damage !== undefined)?.enemyStagger).toBe(12);
    expect(result.events.find(({ event }) => event === "Stagger expired")?.enemyStagger).toBe(0);
    expect(result.events.find(({ event }) => event === "Finisher started")?.frame).toBe(214);
    expect(result.events.filter(({ event }) => event === "Finisher started")).toHaveLength(1);
    expect(result.usedEstimatedTiming).toBe(true);

    const kill = simulateSolo({ ...defaultInput, enemy: { ...defaultInput.enemy, hp: 1 } });
    expect(kill.elapsedFrames).toBe(58);
    expect(kill.remainingHP).toBe(0);
    expect(kill.totalDamage).toBeCloseTo(27.5);
});

test("keeps the next basic sequence through a Battle Skill and Dive Attack", () => {
    const result = simulateSolo({
        ...defaultInput,
        startingSP: 100,
        durationFrames: 400,
        policy: (state) => {
            if (state.frame === 38) return "battle";
            if (state.frame === 284) return "dive";
            return gilbertaRotation({ ...state, legalActions: state.legalActions.filter((id) => id !== "battle") });
        },
    });
    expect(
        result.events
            .filter(({ event }) => event.endsWith("started"))
            .slice(0, 4)
            .map(({ event }) => event),
    ).toEqual(["Basic Attack 1 started", "Battle Skill started", "Dive Attack started", "Basic Attack 2 started"]);
    expect(result.actionCounts).toContainEqual({ id: "dive", label: "Dive Attack", count: 1 });
    expect(result.hitCounts).toContainEqual(
        expect.objectContaining({ label: "Dive Attack", multiplier: 180, count: 1 }),
    );
    expect(result.hitCounts).toContainEqual(
        expect.objectContaining({ label: "Basic Attack 2", multiplier: 41, count: 2 }),
    );
});

test("rolls each hit independently, including Nature Burst, or uses deterministic expected damage", () => {
    const input = { ...defaultInput, stats: { ...stats, critRate: 5 } };
    const roll = jest.fn().mockReturnValueOnce(0.04).mockReturnValue(0.05);
    const rolled = simulateSolo({ ...input, random: roll });
    expect(rolled.events.find(({ event }) => event === "Battle Skill critical hit")?.damage).toBeCloseTo(41.25);
    expect(rolled.events.find(({ event }) => event === "Battle Skill hit")?.damage).toBeCloseTo(27.5);
    expect(rolled.hitCounts).toEqual(
        expect.arrayContaining([
            expect.objectContaining({
                label: "Battle Skill · Gravity Pull",
                multiplier: 55,
                count: 8,
                criticalCount: 1,
            }),
            expect.objectContaining({ label: "Battle Skill · Explosion", multiplier: 130, count: 2, criticalCount: 0 }),
            expect.objectContaining({ label: "Nature Burst", multiplier: 160, count: 1, criticalCount: 0 }),
        ]),
    );

    const allCrits = simulateSolo({ ...input, random: () => 0 });
    expect(allCrits.events.find(({ event }) => event === "Nature Burst critical hit")?.damage).toBeCloseTo(
        80 * (1 + 89 / 196) * 1.5,
    );

    const unusedRoll = jest.fn();
    const aggregated = simulateSolo({ ...input, aggregateCriticalHits: true, random: unusedRoll });
    const hit = aggregated.events.find(({ event }) => event === "Battle Skill hit");
    expect(hit?.damage).toBeCloseTo(27.5 * 1.025);
    expect(hit?.damageBreakdown?.critical?.appliedFactor).toBe(1.025);
    expect(aggregated).toEqual(simulateSolo({ ...input, aggregateCriticalHits: true }));
    expect(unusedRoll).not.toHaveBeenCalled();
});
