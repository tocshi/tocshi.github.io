import { useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import "../../assets/styles/EFCalcUtils.scss";
import charactersData from "./data/characters.json";
import enemyCompositionsData from "./data/enemies.json";
import weaponsData from "./data/weapons.json";
import armorData from "./data/gear-armor.json";
import glovesData from "./data/gear-gloves.json";
import kitData from "./data/gear-kit.json";
import { findGearStatWarnings } from "./gearStatValidation";
import type { GearStats, GearStatSource } from "./gearStatValidation";

enum CharacterAttribute {
    Strength = "strength",
    Agility = "agility",
    Intellect = "intellect",
    Will = "will",
}

const characterAttributes = Object.values(CharacterAttribute);
const characterBaseStatFields = ["baseAtk", "hp", ...characterAttributes] as const;
type CharacterBaseStat = (typeof characterBaseStatFields)[number];

interface Character {
    id: string;
    name: string;
    element: string;
    class: string;
    strength: number;
    agility: number;
    intellect: number;
    will: number;
    baseAtk: number;
    hp: number;
    trustStats?: Partial<Record<CharacterBaseStat, number>>;
    primaryStat: CharacterAttribute;
    secondaryStat: CharacterAttribute;
    basicAttack: CharacterAttack[];
    finisherAttack: CharacterAttack;
    diveAttack: CharacterAttack;
    battleSkills: CharacterAttack[][];
    battleSkillSPCosts: number[];
    comboSkills: CharacterAttack[][];
    comboSkillCooldowns: number[];
    ultimateSkill: UltimateSkill;
}

interface CharacterAttack {
    multiplier: number;
    hitCount: number;
    frames: number;
    cancelFrame: number;
    stagger: number;
    ultimateEnergyGain?: number;
}

interface UltimateSkill extends CharacterAttack {
    ultimateEnergyCost: number;
}

interface Enemy {
    name: string;
    level: number;
    hp: number;
    atk: number;
    def: number;
    resistancePhysical: number;
    resistanceHeat: number;
    resistanceElectric: number;
    resistanceCryo: number;
    resistanceNature: number;
}

interface EnemyComposition {
    id: string;
    name: string;
    enemies: Enemy[];
}

interface CharacterCombatStats {
    strength: number;
    agility: number;
    intellect: number;
    will: number;
    hp: number;
    atk: number;
    def: number;
    critRate: number;
    critDamage: number;
    artsIntensity: number;
    resistancePhysical: number;
    resistanceHeat: number;
    resistanceElectric: number;
    resistanceCryo: number;
    resistanceNature: number;
    resistanceAether: number;
    treatmentBonus: number;
    treatmentReceivedBonus: number;
    comboSkillCooldownReduction: number;
    ultimateGainEfficiency: number;
    staggerEfficiencyBonus: number;
    dmgBonusPhysical: number;
    dmgBonusHeat: number;
    dmgBonusElectric: number;
    dmgBonusCryo: number;
    dmgBonusNature: number;
    dmgBonusBasicAttack: number;
    dmgBonusBattleSkill: number;
    dmgBonusComboSkill: number;
    dmgBonusUltimateSkill: number;
    dmgBonusStagger: number;
    finalDmgReduction: number;
}

interface GearItem {
    id: string;
    name: string;
    type?: string;
    set?: string;
    baseAtk?: number;
    stats: GearStats;
}

const emptyCombatStats: CharacterCombatStats = {
    strength: 0,
    agility: 0,
    intellect: 0,
    will: 0,
    hp: 0,
    atk: 0,
    def: 0,
    critRate: 0,
    critDamage: 0,
    artsIntensity: 0,
    resistancePhysical: 0,
    resistanceHeat: 0,
    resistanceElectric: 0,
    resistanceCryo: 0,
    resistanceNature: 0,
    resistanceAether: 0,
    treatmentBonus: 0,
    treatmentReceivedBonus: 0,
    comboSkillCooldownReduction: 0,
    ultimateGainEfficiency: 0,
    staggerEfficiencyBonus: 0,
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
    finalDmgReduction: 0,
};

const combatStatFields = Object.keys(emptyCombatStats) as Array<keyof CharacterCombatStats>;
const pointStats = new Set<keyof CharacterCombatStats>([
    "strength",
    "agility",
    "intellect",
    "will",
    "hp",
    "atk",
    "def",
    "artsIntensity",
]);
const combatStatFormatter = new Intl.NumberFormat("en", { maximumFractionDigits: 2, useGrouping: false });
const damageBonusFormatter = new Intl.NumberFormat("en", { maximumFractionDigits: 1, useGrouping: false });
const gearSetBonuses = new Map<string, { pieces: number; stats: Partial<CharacterCombatStats> }>([
    [
        "tide-surge",
        {
            pieces: 3,
            stats: { dmgBonusBattleSkill: 20, dmgBonusComboSkill: 20, dmgBonusUltimateSkill: 20 },
        },
    ],
]);
const gearDataSources: GearStatSource[] = [
    { category: "Weapon", items: weaponsData },
    { category: "Armor", items: armorData },
    { category: "Gloves", items: glovesData },
    { category: "Kit", items: kitData },
];
export const gearStatWarnings = findGearStatWarnings(gearDataSources, new Set(combatStatFields));

function calculateCombatStats(
    character: Character,
    weapon: GearItem | null,
    gear: readonly (GearItem | null)[],
    potential: number,
): CharacterCombatStats {
    const setCounts = new Map<string, number>();
    for (const item of gear) {
        if (item?.set) {
            setCounts.set(item.set, (setCounts.get(item.set) ?? 0) + 1);
        }
    }

    const bonuses: Partial<CharacterCombatStats>[] = [];
    for (const item of [weapon, ...gear]) {
        if (item) bonuses.push(item.stats);
    }
    setCounts.forEach((count, set) => {
        const bonus = gearSetBonuses.get(set);
        if (bonus && count >= bonus.pieces) bonuses.push(bonus.stats);
    });

    const stats: CharacterCombatStats = { ...emptyCombatStats, critRate: 5, critDamage: 50 };
    for (const bonus of bonuses) {
        for (const field of combatStatFields) {
            if (field !== "finalDmgReduction") stats[field] += bonus[field] ?? 0;
        }
    }
    const damageTaken = bonuses.reduce((factor, bonus) => factor * (1 - (bonus.finalDmgReduction ?? 0) / 100), 1);
    stats.finalDmgReduction = (1 - damageTaken) * 100;

    const trustStats = character.trustStats;
    for (const attribute of characterAttributes) {
        stats[attribute] += character[attribute] + (trustStats?.[attribute] ?? 0);
    }

    const baseAtk = character.baseAtk + (trustStats?.baseAtk ?? 0) + (weapon?.baseAtk ?? 0);
    const attributeMultiplier = 1 + 0.005 * stats[character.primaryStat] + 0.002 * stats[character.secondaryStat];
    // Equipment stats.atk is stored in percentage points.
    stats.atk = baseAtk * (1 + stats.atk / 100) * attributeMultiplier;
    stats.hp += character.hp + (trustStats?.hp ?? 0) + 5 * stats.strength;

    const physicalResistance = 100 * (1 - 1 / (1 + 0.001 * stats.agility));
    const artsResistance = 100 * (1 - 1 / (1 + 0.001 * stats.intellect));
    stats.resistancePhysical = Math.min(90, stats.resistancePhysical + physicalResistance);
    for (const field of ["resistanceHeat", "resistanceElectric", "resistanceCryo", "resistanceNature"] as const) {
        stats[field] = Math.min(90, stats[field] + artsResistance);
    }
    stats.treatmentReceivedBonus += 0.1 * stats.will;

    if (character.id === "gilberta") {
        stats.ultimateGainEfficiency += 7 + (potential >= 3 ? 5 : 0);
    }

    return stats;
}

function isCharacterAttribute(value: string): value is CharacterAttribute {
    return characterAttributes.some((attribute) => attribute === value);
}

const characters: Character[] = charactersData.map((character) => {
    if (!isCharacterAttribute(character.primaryStat) || !isCharacterAttribute(character.secondaryStat)) {
        throw new Error(`Invalid primary or secondary stat for character "${character.id}".`);
    }

    return {
        ...character,
        primaryStat: character.primaryStat,
        secondaryStat: character.secondaryStat,
    };
});

function updateNumber<T extends Character | Enemy>(
    records: T[],
    index: number,
    field: keyof T,
    value: number,
    setRecords: (updated: T[]) => void,
) {
    setRecords(records.map((record, recordIndex) => (recordIndex === index ? { ...record, [field]: value } : record)));
}

function getCombatStatLabel(field: keyof CharacterCombatStats): string {
    switch (field) {
        case "resistanceHeat":
            return "Heat Resistance";
        case "resistanceElectric":
            return "Electric Resistance";
        case "resistanceCryo":
            return "Cryo Resistance";
        case "resistanceNature":
            return "Nature Resistance";
        case "resistancePhysical":
            return "Physical Resistance";
        case "resistanceAether":
            return "AEther Resistance";
        case "dmgBonusHeat":
            return "Heat Damage Bonus";
        case "dmgBonusElectric":
            return "Electric Damage Bonus";
        case "dmgBonusCryo":
            return "Cryo Damage Bonus";
        case "dmgBonusNature":
            return "Nature Damage Bonus";
        case "dmgBonusPhysical":
            return "Physical Damage Bonus";
        case "dmgBonusBasicAttack":
            return "Basic Attack Damage Bonus";
        case "dmgBonusBattleSkill":
            return "Battle Skill Damage Bonus";
        case "dmgBonusComboSkill":
            return "Combo Skill Damage Bonus";
        case "dmgBonusUltimateSkill":
            return "Ultimate Skill Damage Bonus";
        case "dmgBonusStagger":
            return "Stagger Damage Bonus";
        default:
            return field
                .replace(/([A-Z])/g, " $1")
                .replace(/^./, (firstLetter) => firstLetter.toUpperCase())
                .replace(/^Dmg/, "Damage")
                .replace(/\bHp\b/g, "HP")
                .replace(/\bAtk\b/g, "ATK")
                .replace(/\bDef\b/g, "DEF");
    }
}

function formatCombatStat(field: keyof CharacterCombatStats, value: number): string {
    if (field === "atk") return String(Math.floor(value));

    const displayValue = field === "ultimateGainEfficiency" ? 100 + value : value;
    const formatter = field.startsWith("dmgBonus") ? damageBonusFormatter : combatStatFormatter;
    return `${formatter.format(displayValue)}${pointStats.has(field) ? "" : "%"}`;
}

function EFCalcUtils() {
    const [characterRecords, setCharacters] = useState<Character[]>(characters);
    const [compositions, setCompositions] = useState<EnemyComposition[]>(enemyCompositionsData);
    const [selectedCharacterId, setSelectedCharacterId] = useState(characters[0]?.id ?? "");
    const [operatorPotentials, setOperatorPotentials] = useState<Record<string, number | "">>({});
    const [selectedCompositionId, setSelectedCompositionId] = useState(enemyCompositionsData[0]?.id ?? "");
    const [selectedWeapon, setSelectedWeapon] = useState<GearItem | null>(null);
    const [selectedArmor, setSelectedArmor] = useState<GearItem | null>(null);
    const [selectedGloves, setSelectedGloves] = useState<GearItem | null>(null);
    const [selectedKit1, setSelectedKit1] = useState<GearItem | null>(null);
    const [selectedKit2, setSelectedKit2] = useState<GearItem | null>(null);
    const [stageModifiers, setStageModifiers] = useState<CharacterCombatStats>({ ...emptyCombatStats });

    const selectedCharacter = characterRecords.find((character) => character.id === selectedCharacterId);
    const selectedComposition = compositions.find((composition) => composition.id === selectedCompositionId);
    const potential = operatorPotentials[selectedCharacterId] ?? 0;
    const combatStats = selectedCharacter
        ? calculateCombatStats(
              selectedCharacter,
              selectedWeapon,
              [selectedArmor, selectedGloves, selectedKit1, selectedKit2],
              Number(potential),
          )
        : emptyCombatStats;

    const updateCharacter = (index: number, field: keyof Character, value: number) => {
        updateNumber(characterRecords, index, field, value, setCharacters);
    };

    const updateEnemy = (compositionIndex: number, enemyIndex: number, field: keyof Enemy, value: number) => {
        setCompositions((current) =>
            current.map((composition, currentCompositionIndex) =>
                currentCompositionIndex === compositionIndex
                    ? {
                          ...composition,
                          enemies: composition.enemies.map((enemy, currentEnemyIndex) =>
                              currentEnemyIndex === enemyIndex ? { ...enemy, [field]: value } : enemy,
                          ),
                      }
                    : composition,
            ),
        );
    };

    const characterIndex = characterRecords.findIndex((character) => character.id === selectedCharacterId);
    const compositionIndex = compositions.findIndex((composition) => composition.id === selectedCompositionId);

    return (
        <main className="efcalc-container">
            <header className="efcalc-header">
                <h1>Endfield Solo Calculator</h1>
                <p>A work in progress for comparing solo operator stats against enemy compositions.</p>
            </header>

            <div className="efcalc-selectors">
                <div className="efcalc-operator-selector">
                    <Autocomplete
                        disablePortal
                        disableClearable
                        fullWidth
                        options={characterRecords}
                        value={selectedCharacter}
                        getOptionLabel={(character) => character.name}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        onChange={(_, character) => setSelectedCharacterId(character?.id ?? "")}
                        renderInput={(params) => <TextField {...params} label="Operator" />}
                    />
                    <TextField
                        label="Potential"
                        type="number"
                        value={potential}
                        disabled={!selectedCharacter}
                        slotProps={{ htmlInput: { min: 0, max: 5, step: 1 } }}
                        onChange={(event) => {
                            const { value, valueAsNumber } = event.target as HTMLInputElement;
                            const level = value === "" ? "" : Math.min(5, Math.max(0, Math.trunc(valueAsNumber)));
                            setOperatorPotentials((current) => ({ ...current, [selectedCharacterId]: level }));
                        }}
                    />
                </div>
                <Autocomplete
                    disablePortal
                    disableClearable
                    fullWidth
                    options={compositions}
                    value={selectedComposition}
                    getOptionLabel={(composition) => composition.name}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    onChange={(_, composition) => setSelectedCompositionId(composition?.id ?? "")}
                    renderInput={(params) => <TextField {...params} label="Enemy" />}
                />
            </div>

            <div className="efcalc-editors">
                {selectedCharacter && (
                    <section className="efcalc-panel" aria-labelledby="efcalc-operator-base-stats-heading">
                        <h2 id="efcalc-operator-base-stats-heading">Operator base stats</h2>
                        {/* <p>Edit these values in src/components/efcalcutils/data/characters.json.</p> */}
                        <div className="efcalc-fields">
                            <TextField
                                label="ATK"
                                type="number"
                                value={selectedCharacter.baseAtk}
                                onChange={(event) =>
                                    updateCharacter(characterIndex, "baseAtk", Number(event.target.value))
                                }
                                slotProps={{ htmlInput: { min: 0 } }}
                            />
                            <TextField
                                label="HP"
                                type="number"
                                value={selectedCharacter.hp}
                                onChange={(event) => updateCharacter(characterIndex, "hp", Number(event.target.value))}
                                slotProps={{ htmlInput: { min: 0 } }}
                            />
                            {characterAttributes.map((attribute) => (
                                <TextField
                                    key={attribute}
                                    label={attribute[0].toUpperCase() + attribute.slice(1)}
                                    type="number"
                                    value={selectedCharacter[attribute]}
                                    onChange={(event) =>
                                        updateCharacter(characterIndex, attribute, Number(event.target.value))
                                    }
                                    slotProps={{ htmlInput: { min: 0 } }}
                                />
                            ))}
                            {characterBaseStatFields
                                .filter((field) => selectedCharacter.trustStats?.[field] !== undefined)
                                .map((field) => (
                                    <TextField
                                        key={`trust-${field}`}
                                        label={`Trust ${getCombatStatLabel(field === "baseAtk" ? "atk" : field)}`}
                                        type="number"
                                        value={selectedCharacter.trustStats?.[field]}
                                        slotProps={{ htmlInput: { readOnly: true } }}
                                    />
                                ))}
                        </div>
                    </section>
                )}

                {selectedComposition && (
                    <section className="efcalc-panel">
                        <h2>Enemy composition</h2>
                        {/* <p>Edit composition data in src/components/efcalcutils/data/enemies.json.</p> */}
                        {selectedComposition.enemies.map((enemy, enemyIndex) => (
                            <div className="efcalc-enemy" key={`${enemy.name}-${enemyIndex}`}>
                                <h3>{enemy.name}</h3>
                                <div className="efcalc-fields">
                                    <TextField
                                        label="Level"
                                        type="number"
                                        value={enemy.level}
                                        onChange={(event) =>
                                            updateEnemy(
                                                compositionIndex,
                                                enemyIndex,
                                                "level",
                                                Number(event.target.value),
                                            )
                                        }
                                    />
                                    <TextField
                                        label="HP"
                                        type="number"
                                        value={enemy.hp}
                                        onChange={(event) =>
                                            updateEnemy(compositionIndex, enemyIndex, "hp", Number(event.target.value))
                                        }
                                    />
                                    <TextField
                                        label="ATK"
                                        type="number"
                                        value={enemy.atk}
                                        onChange={(event) =>
                                            updateEnemy(compositionIndex, enemyIndex, "atk", Number(event.target.value))
                                        }
                                    />
                                    <TextField
                                        label="DEF"
                                        type="number"
                                        value={enemy.def}
                                        onChange={(event) =>
                                            updateEnemy(compositionIndex, enemyIndex, "def", Number(event.target.value))
                                        }
                                        slotProps={{ htmlInput: { min: 0 } }}
                                    />
                                    {(
                                        [
                                            ["resistancePhysical", "Physical resistance"],
                                            ["resistanceHeat", "Heat resistance"],
                                            ["resistanceElectric", "Electric resistance"],
                                            ["resistanceCryo", "Cryo resistance"],
                                            ["resistanceNature", "Nature resistance"],
                                        ] as const
                                    ).map(([field, label]) => (
                                        <TextField
                                            key={field}
                                            label={label}
                                            type="number"
                                            value={enemy[field]}
                                            onChange={(event) =>
                                                updateEnemy(
                                                    compositionIndex,
                                                    enemyIndex,
                                                    field,
                                                    Number(event.target.value),
                                                )
                                            }
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </section>
                )}
            </div>

            <section className="efcalc-panel efcalc-equipment-panel">
                <h2>Equipment</h2>
                {gearStatWarnings.length > 0 && (
                    <div className="efcalc-gear-warning" role="alert">
                        <strong>Some gear stats are not in CharacterCombatStats:</strong>
                        <ul>
                            {gearStatWarnings.map((warning) => (
                                <li key={`${warning.category}-${warning.itemName}`}>
                                    {warning.category} — {warning.itemName}: {warning.unknownKeys.join(", ")}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                <div className="efcalc-equipment-grid">
                    <Autocomplete<GearItem>
                        disablePortal
                        options={weaponsData}
                        value={selectedWeapon}
                        getOptionLabel={(item) => item.name}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        onChange={(_, item) => setSelectedWeapon(item)}
                        renderInput={(params) => <TextField {...params} label="Weapon" />}
                    />
                    <Autocomplete<GearItem>
                        disablePortal
                        options={armorData}
                        value={selectedArmor}
                        getOptionLabel={(item) => item.name}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        onChange={(_, item) => setSelectedArmor(item)}
                        renderInput={(params) => <TextField {...params} label="Armor" />}
                    />
                    <Autocomplete<GearItem>
                        disablePortal
                        options={glovesData}
                        value={selectedGloves}
                        getOptionLabel={(item) => item.name}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        onChange={(_, item) => setSelectedGloves(item)}
                        renderInput={(params) => <TextField {...params} label="Gloves" />}
                    />
                    <Autocomplete<GearItem>
                        disablePortal
                        options={kitData}
                        value={selectedKit1}
                        getOptionLabel={(item) => item.name}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        onChange={(_, item) => setSelectedKit1(item)}
                        renderInput={(params) => <TextField {...params} label="Kit 1" />}
                    />
                    <Autocomplete<GearItem>
                        disablePortal
                        options={kitData}
                        value={selectedKit2}
                        getOptionLabel={(item) => item.name}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        onChange={(_, item) => setSelectedKit2(item)}
                        renderInput={(params) => <TextField {...params} label="Kit 2" />}
                    />
                </div>
            </section>

            <div className="efcalc-editors efcalc-stat-panels">
                <section className="efcalc-panel" aria-labelledby="efcalc-combat-stats-heading">
                    <h2 id="efcalc-combat-stats-heading">Combat Stats</h2>
                    <p>These are the stats you'll see on the Attributes screen.</p>
                    <div className="efcalc-fields efcalc-stat-fields">
                        {combatStatFields.map((field) => (
                            <TextField
                                key={field}
                                label={getCombatStatLabel(field)}
                                value={formatCombatStat(field, combatStats[field])}
                                slotProps={{ htmlInput: { readOnly: true } }}
                            />
                        ))}
                    </div>
                </section>
                <section className="efcalc-panel">
                    <h2>Stage Modifiers</h2>
                    <p>External modifiers applied in-combat.</p>
                    <div className="efcalc-fields efcalc-stat-fields">
                        {combatStatFields.map((field) => (
                            <TextField
                                key={field}
                                label={getCombatStatLabel(field)}
                                type="number"
                                value={stageModifiers[field]}
                                onChange={(event) =>
                                    setStageModifiers((current) => ({
                                        ...current,
                                        [field]: Number(event.target.value),
                                    }))
                                }
                            />
                        ))}
                    </div>
                </section>
            </div>

            <section className="efcalc-result" aria-live="polite">
                <h2>Attack Damage Placeholders</h2>
                {selectedCharacter && (
                    <>
                        <p className="efcalc-result-note">
                            Values below are attack multipliers, not calculated damage.
                        </p>
                        <div className="efcalc-attack-groups">
                            <section className="efcalc-attack-group">
                                <h3>Basic Attacks</h3>
                                {selectedCharacter.basicAttack.map((attack, index) => (
                                    <div className="efcalc-attack-value" key={`basic-${index}`}>
                                        <span>SEQ {index + 1}</span>
                                        <strong>{attack.multiplier}%</strong>
                                    </div>
                                ))}
                            </section>
                            <section className="efcalc-attack-group">
                                <h3>Dive Attack</h3>
                                <div className="efcalc-attack-value">
                                    <span>Multiplier</span>
                                    <strong>{selectedCharacter.diveAttack.multiplier}%</strong>
                                </div>
                            </section>
                            <section className="efcalc-attack-group">
                                <h3>Finisher Attack</h3>
                                <div className="efcalc-attack-value">
                                    <span>Multiplier</span>
                                    <strong>{selectedCharacter.finisherAttack.multiplier}%</strong>
                                </div>
                            </section>
                            <section className="efcalc-attack-group">
                                <h3>Battle Skills</h3>
                                {selectedCharacter.battleSkills.map((skill, skillIndex) => (
                                    <div className="efcalc-skill" key={`battle-skill-${skillIndex}`}>
                                        <h4>Battle Skill {skillIndex + 1}</h4>
                                        {skill.map((attack, hitIndex) => (
                                            <div className="efcalc-attack-value" key={`hit-${hitIndex}`}>
                                                <span>Hit {hitIndex + 1}</span>
                                                <strong>{attack.multiplier}%</strong>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </section>
                            <section className="efcalc-attack-group">
                                <h3>Combo Skills</h3>
                                {selectedCharacter.comboSkills.map((skill, skillIndex) => (
                                    <div className="efcalc-skill" key={`combo-skill-${skillIndex}`}>
                                        <h4>Combo Skill {skillIndex + 1}</h4>
                                        {skill.map((attack, hitIndex) => (
                                            <div className="efcalc-attack-value" key={`hit-${hitIndex}`}>
                                                <span>Hit {hitIndex + 1}</span>
                                                <strong>{attack.multiplier}%</strong>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </section>
                            <section className="efcalc-attack-group">
                                <h3>Ultimate Attack</h3>
                                <div className="efcalc-attack-value">
                                    <span>Multiplier</span>
                                    <strong>{selectedCharacter.ultimateSkill.multiplier}%</strong>
                                </div>
                            </section>
                        </div>
                    </>
                )}
            </section>
        </main>
    );
}

export default EFCalcUtils;
