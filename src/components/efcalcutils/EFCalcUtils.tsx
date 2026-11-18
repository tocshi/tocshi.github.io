import { useEffect, useState } from "react";
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
    element: DamageElement;
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
    // Some listed totals differ from the actual multiplier of each hit.
    perHitMultiplier?: number;
    frames: number;
    cancelFrame: number;
    stagger: number;
    ultimateEnergyGain?: number;
    potentialDamageMultiplier?: { level: number; multiplier: number };
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
    finisherMultiplier?: number;
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

const equipmentLabels = { weapon: "Weapon", armor: "Armor", gloves: "Gloves", kit1: "Kit 1", kit2: "Kit 2" };
type EquipmentSlot = keyof typeof equipmentLabels;
const equipmentSlots = Object.keys(equipmentLabels) as EquipmentSlot[];
const equipmentOptions: Record<EquipmentSlot, readonly GearItem[]> = {
    weapon: weaponsData,
    armor: armorData,
    gloves: glovesData,
    kit1: kitData,
    kit2: kitData,
};

interface CalculatorSelections {
    operatorId: string;
    compositionId: string;
    operatorPotentials: Record<string, number | "">;
    equipment: Partial<Record<EquipmentSlot, string>>;
}

const selectionsStorageKey = "efcalc.selections.v1";
const defaultSelections: CalculatorSelections = {
    operatorId: charactersData[0]?.id ?? "",
    compositionId: enemyCompositionsData[0]?.id ?? "",
    operatorPotentials: {},
    equipment: {},
};

function readSelections(): CalculatorSelections {
    try {
        const storedSelections = window.localStorage.getItem(selectionsStorageKey);
        const saved: Partial<CalculatorSelections> | null = storedSelections ? JSON.parse(storedSelections) : null;
        if (!saved) return defaultSelections;

        const operatorPotentials: CalculatorSelections["operatorPotentials"] = {};
        for (const { id } of charactersData) {
            const level = saved.operatorPotentials?.[id];
            if (typeof level === "number" && Number.isInteger(level) && level >= 0 && level <= 5) {
                operatorPotentials[id] = level;
            }
        }

        const equipment: CalculatorSelections["equipment"] = {};
        for (const slot of equipmentSlots) {
            const item = equipmentOptions[slot].find(({ id }) => id === saved.equipment?.[slot]);
            if (item) equipment[slot] = item.id;
        }

        return {
            operatorId: charactersData.find(({ id }) => id === saved.operatorId)?.id ?? defaultSelections.operatorId,
            compositionId:
                enemyCompositionsData.find(({ id }) => id === saved.compositionId)?.id ?? defaultSelections.compositionId,
            operatorPotentials,
            equipment,
        };
    } catch {
        return defaultSelections;
    }
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
const damageElementFields = {
    Physical: { bonus: "dmgBonusPhysical", resistance: "resistancePhysical" },
    Heat: { bonus: "dmgBonusHeat", resistance: "resistanceHeat" },
    Electric: { bonus: "dmgBonusElectric", resistance: "resistanceElectric" },
    Cryo: { bonus: "dmgBonusCryo", resistance: "resistanceCryo" },
    Nature: { bonus: "dmgBonusNature", resistance: "resistanceNature" },
} as const;
type DamageElement = keyof typeof damageElementFields;

const attackTypeBonus = {
    basic: "dmgBonusBasicAttack",
    dive: "dmgBonusBasicAttack",
    finisher: "dmgBonusBasicAttack",
    battle: "dmgBonusBattleSkill",
    combo: "dmgBonusComboSkill",
    ultimate: "dmgBonusUltimateSkill",
} as const;
type AttackType = keyof typeof attackTypeBonus;
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
    stageModifiers?: CharacterCombatStats,
): CharacterCombatStats {
    const setCounts = new Map<string, number>();
    for (const item of gear) {
        if (item?.set) {
            setCounts.set(item.set, (setCounts.get(item.set) ?? 0) + 1);
        }
    }

    const bonuses: Partial<CharacterCombatStats>[] = stageModifiers ? [stageModifiers] : [];
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

function calculateNonCritDamage(
    attack: CharacterAttack,
    type: AttackType,
    element: DamageElement,
    stats: CharacterCombatStats,
    enemy: Enemy,
    potential: number,
): number {
    const elementFields = damageElementFields[element];
    const isFinisher = type === "finisher";
    const staggerBonus = isFinisher ? stats.dmgBonusStagger : 0;
    const damageBonus = stats[elementFields.bonus] + stats[attackTypeBonus[type]] + staggerBonus;
    const potentialBonus = attack.potentialDamageMultiplier;
    const potentialMultiplier = potentialBonus && potential >= potentialBonus.level ? potentialBonus.multiplier : 1;
    const perHitMultiplier = attack.perHitMultiplier ?? attack.multiplier / attack.hitCount;
    const hitMultiplier = (perHitMultiplier / 100) * potentialMultiplier;
    const defenseMultiplier = enemy.def >= 0 ? 100 / (100 + enemy.def) : 2 - 0.99 ** -enemy.def;
    const resistanceMultiplier = Math.max(0, 1 - enemy[elementFields.resistance] / 100);
    const finisherMultiplier = isFinisher ? 1.3 * (enemy.finisherMultiplier ?? 1) : 1;

    return stats.atk * hitMultiplier * (1 + damageBonus / 100) * defenseMultiplier * resistanceMultiplier * finisherMultiplier;
}

function isCharacterAttribute(value: string): value is CharacterAttribute {
    return characterAttributes.some((attribute) => attribute === value);
}

const characters: Character[] = charactersData.map((character) => {
    if (!isCharacterAttribute(character.primaryStat) || !isCharacterAttribute(character.secondaryStat)) {
        throw new Error(`Invalid primary or secondary stat for character "${character.id}".`);
    }
    const element = Object.keys(damageElementFields).find((element) => element === character.element) as DamageElement | undefined;
    if (!element) throw new Error(`Invalid damage element for character "${character.id}".`);

    return {
        ...character,
        element,
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

function AttackDamageResults({
    character,
    enemy,
    stats,
    potential,
}: {
    character: Character;
    enemy: Enemy;
    stats: CharacterCombatStats;
    potential: number;
}) {
    const renderHit = (attack: CharacterAttack, type: AttackType, label: string) => {
        const damage = calculateNonCritDamage(attack, type, character.element, stats, enemy, potential);
        return (
            <div className="efcalc-attack-value" key={label}>
                <span>{label}</span>
                <strong>
                    {Math.round(damage)}
                    {attack.hitCount > 1 && ` × ${attack.hitCount}`}
                </strong>
            </div>
        );
    };

    const renderSkills = (skills: CharacterAttack[][], type: "battle" | "combo", label: string) =>
        skills.map((skill, skillIndex) => (
            <div className="efcalc-skill" key={skillIndex}>
                <h5>{label} {skillIndex + 1}</h5>
                {skill.map((attack, partIndex) => renderHit(attack, type, `Part ${partIndex + 1}`))}
            </div>
        ));

    return (
        <div className="efcalc-damage-target">
            <h3>{enemy.name}</h3>
            <div className="efcalc-attack-groups">
                <section className="efcalc-attack-group">
                    <h4>Basic Attacks</h4>
                    {character.basicAttack.map((attack, index) => renderHit(attack, "basic", `SEQ ${index + 1}`))}
                </section>
                <section className="efcalc-attack-group">
                    <h4>Dive Attack</h4>
                    {renderHit(character.diveAttack, "dive", "Damage")}
                </section>
                <section className="efcalc-attack-group">
                    <h4>Finisher Attack</h4>
                    {renderHit(character.finisherAttack, "finisher", "Damage")}
                </section>
                <section className="efcalc-attack-group">
                    <h4>Battle Skills</h4>
                    {renderSkills(character.battleSkills, "battle", "Battle Skill")}
                </section>
                <section className="efcalc-attack-group">
                    <h4>Combo Skills</h4>
                    {renderSkills(character.comboSkills, "combo", "Combo Skill")}
                </section>
                <section className="efcalc-attack-group">
                    <h4>Ultimate Attack</h4>
                    {renderHit(character.ultimateSkill, "ultimate", "Damage")}
                </section>
            </div>
        </div>
    );
}

function EFCalcUtils() {
    const [characterRecords, setCharacters] = useState<Character[]>(characters);
    const [compositions, setCompositions] = useState<EnemyComposition[]>(enemyCompositionsData);
    const [selections, setSelections] = useState(readSelections);
    const [stageModifiers, setStageModifiers] = useState<CharacterCombatStats>({ ...emptyCombatStats });

    useEffect(() => {
        try {
            window.localStorage.setItem(selectionsStorageKey, JSON.stringify(selections));
        } catch {
            // The calculator still works when browser storage is unavailable.
        }
    }, [selections]);

    const { operatorId: selectedCharacterId, compositionId: selectedCompositionId, operatorPotentials } = selections;
    const getEquipment = (slot: EquipmentSlot) =>
        equipmentOptions[slot].find((item) => item.id === selections.equipment[slot]) ?? null;
    const selectedCharacter = characterRecords.find((character) => character.id === selectedCharacterId);
    const selectedComposition = compositions.find((composition) => composition.id === selectedCompositionId);
    const potential = operatorPotentials[selectedCharacterId] ?? 0;
    const selectedWeapon = getEquipment("weapon");
    const equippedGear = [getEquipment("armor"), getEquipment("gloves"), getEquipment("kit1"), getEquipment("kit2")];
    const combatStats = selectedCharacter
        ? calculateCombatStats(selectedCharacter, selectedWeapon, equippedGear, Number(potential))
        : emptyCombatStats;
    const damageStats = selectedCharacter
        ? calculateCombatStats(selectedCharacter, selectedWeapon, equippedGear, Number(potential), stageModifiers)
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
                        onChange={(_, character) =>
                            setSelections((current) => ({ ...current, operatorId: character.id }))
                        }
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
                            setSelections((current) => ({
                                ...current,
                                operatorPotentials: { ...current.operatorPotentials, [selectedCharacterId]: level },
                            }));
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
                    onChange={(_, composition) =>
                        setSelections((current) => ({ ...current, compositionId: composition.id }))
                    }
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
                    <section className="efcalc-panel" aria-labelledby="efcalc-enemy-heading">
                        <h2 id="efcalc-enemy-heading">Enemy composition</h2>
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
                    {equipmentSlots.map((slot) => (
                        <Autocomplete<GearItem>
                            key={slot}
                            disablePortal
                            options={equipmentOptions[slot]}
                            value={getEquipment(slot)}
                            getOptionLabel={(item) => item.name}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            onChange={(_, item) =>
                                setSelections((current) => ({
                                    ...current,
                                    equipment: { ...current.equipment, [slot]: item?.id },
                                }))
                            }
                            renderInput={(params) => <TextField {...params} label={equipmentLabels[slot]} />}
                        />
                    ))}
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
                <section className="efcalc-panel" aria-labelledby="efcalc-stage-modifiers-heading">
                    <h2 id="efcalc-stage-modifiers-heading">Stage Modifiers</h2>
                    <p>External modifiers applied in-combat.</p>
                    <div className="efcalc-fields efcalc-stat-fields">
                        {combatStatFields.map((field) => (
                            <TextField
                                key={field}
                                label={field === "atk" ? "ATK Bonus (%)" : getCombatStatLabel(field)}
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

            <section className="efcalc-result" aria-live="polite" aria-labelledby="efcalc-attack-damage-heading">
                <h2 id="efcalc-attack-damage-heading">Attack Damage Calculations</h2>
                <p className="efcalc-result-note">
                    Non-crit damage per hit. Finishers assume a staggered target.
                </p>
                {selectedCharacter && selectedComposition?.enemies.map((enemy, index) => (
                    <AttackDamageResults
                        key={`${enemy.name}-${index}`}
                        character={selectedCharacter}
                        enemy={enemy}
                        stats={damageStats}
                        potential={Number(potential)}
                    />
                ))}
            </section>
        </main>
    );
}

export default EFCalcUtils;
