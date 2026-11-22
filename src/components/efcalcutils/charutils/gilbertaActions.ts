import type { Character, CharacterAttack, CharacterCombatStats } from "../EFCalcUtils";
import type { AttackType } from "../utils/combatDamage";
import { toFrames } from "../utils/simulation";
import type { SimulationAction, SimulationHit } from "../utils/simulation";

function hits(attack: CharacterAttack, offsets: readonly number[], label?: string): SimulationHit[] {
    if (offsets.length !== attack.hitCount) throw new Error("Gilberta's hit timings do not match her attack data.");
    return offsets.map((seconds, index) => ({
        frame: toFrames(seconds),
        attack,
        label,
        stagger: index === offsets.length - 1 ? attack.stagger : 0,
    }));
}

export function gilbertaEnergyCost(character: Character, potential: number): number {
    return character.ultimateSkill.ultimateEnergyCost * (potential >= 4 ? 0.85 : 1);
}

// Endaxis supplies the skill durations. Endline supplies the basic-sequence splits and impact times.
// https://zmdlogs.com/axis/btl_upload_4dfc7c5033d2/editor
// https://endline.app/operators/op-gilberta
export function gilbertaActions(
    character: Character,
    stats: Pick<CharacterCombatStats, "comboSkillCooldownReduction">,
    potential: number,
): SimulationAction[] {
    const basicTiming = [
        { recovery: 0.633, hits: [0.23] },
        { recovery: 0.767, hits: [0.13, 0.267] },
        { recovery: 0.8, hits: [0.233, 0.333, 0.467] },
        { recovery: 1.367, hits: [0.767, 0.833, 0.9] },
    ];
    const basic = basicTiming.map(
        (timing, index): SimulationAction => ({
            id: `basic-${index + 1}`,
            label: `Basic Attack ${index + 1}`,
            type: "basic",
            recoveryFrames: toFrames(timing.recovery),
            hits: hits(character.basicAttack[index], timing.hits).map((hit, hitIndex) => ({
                ...hit,
                spGain: index === 3 && hitIndex === timing.hits.length - 1 ? 16 : undefined,
            })),
        }),
    );
    const [pull, explosion] = character.battleSkills[0];
    const combo = character.comboSkills[0][0];
    const action = (type: AttackType, label: string, recovery: number, events: SimulationHit[]): SimulationAction => ({
        id: type,
        type,
        label,
        recoveryFrames: toFrames(recovery),
        hits: events,
    });

    return [
        ...basic,
        {
            ...action("dive", "Dive Attack", 1.2, hits(character.diveAttack, [0.6])),
            estimatedTiming: true,
        },
        {
            ...action("finisher", "Finisher", 1.5, hits(character.finisherAttack, [0.75])),
            estimatedTiming: true,
        },
        {
            ...action("battle", "Battle Skill", 4.1, [
                ...hits(pull, [0.97, 1.53, 2.067, 2.6], "Gravity Pull"),
                { ...hits(explosion, [3.6], "Explosion")[0], appliesNature: true },
            ]),
            spCost: character.battleSkillSPCosts[0],
            energyOnCast: 6.5,
        },
        {
            ...action("combo", "Combo Skill", 1.77, [
                { ...hits(combo, [1.6])[0], energyGain: combo.ultimateEnergyGain, appliesLift: true },
            ]),
            cooldownFrames: toFrames(
                (character.comboSkillCooldowns[0] - (potential >= 5 ? 2 : 0)) *
                    Math.max(0, 1 - stats.comboSkillCooldownReduction / 100),
            ),
        },
        {
            ...action("ultimate", "Ultimate", 2.13, [
                { ...hits(character.ultimateSkill, [2])[0], appliesNature: true, appliesGravityField: true },
            ]),
            energyCost: gilbertaEnergyCost(character, potential),
            cooldownFrames: toFrames(20),
            effectPauseFrames: toFrames(1.73),
        },
    ];
}
