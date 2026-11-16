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
import type { GearStatSource } from "./gearStatValidation";

enum CharacterAttribute {
    Strength = "strength",
    Agility = "agility",
    Intellect = "intellect",
    Will = "will",
}

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
    attack: number;
    defense: number;
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
    stats: Record<string, number>;
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
const gearDataSources: GearStatSource[] = [
    { category: "Weapon", items: weaponsData },
    { category: "Armor", items: armorData },
    { category: "Gloves", items: glovesData },
    { category: "Kit", items: kitData },
];
export const gearStatWarnings = findGearStatWarnings(gearDataSources, new Set(combatStatFields));

function isCharacterAttribute(value: string): value is CharacterAttribute {
    return Object.values(CharacterAttribute).some((attribute) => attribute === value);
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
    return field
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (firstLetter) => firstLetter.toUpperCase())
        .replace(/^Dmg/, "Damage")
        .replace(/\bAtk\b/g, "ATK")
        .replace(/\bDef\b/g, "DEF");
}

function EFCalcUtils() {
    const [characterRecords, setCharacters] = useState<Character[]>(characters);
    const [compositions, setCompositions] = useState<EnemyComposition[]>(enemyCompositionsData);
    const [selectedCharacterId, setSelectedCharacterId] = useState(characters[0]?.id ?? "");
    const [selectedCompositionId, setSelectedCompositionId] = useState(enemyCompositionsData[0]?.id ?? "");
    const [selectedWeapon, setSelectedWeapon] = useState<GearItem | null>(null);
    const [selectedArmor, setSelectedArmor] = useState<GearItem | null>(null);
    const [selectedGloves, setSelectedGloves] = useState<GearItem | null>(null);
    const [selectedKit1, setSelectedKit1] = useState<GearItem | null>(null);
    const [selectedKit2, setSelectedKit2] = useState<GearItem | null>(null);
    const [stageModifiers, setStageModifiers] = useState<CharacterCombatStats>({ ...emptyCombatStats });

    const selectedCharacter = characterRecords.find((character) => character.id === selectedCharacterId);
    const selectedComposition = compositions.find((composition) => composition.id === selectedCompositionId);
    const combatStats = emptyCombatStats;

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
                <h1>Endfield Combat Calculator</h1>
                <p>
                    A work in progress for comparing operator stats against enemy compositions. Your edits stay in this
                    page for now.
                </p>
            </header>

            <div className="efcalc-selectors">
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
                    <section className="efcalc-panel">
                        <h2>Operator base stats</h2>
                        {/* <p>Edit these values in src/components/efcalcutils/data/characters.json.</p> */}
                        <div className="efcalc-fields">
                            <TextField
                                label="ATK"
                                type="number"
                                value={selectedCharacter.baseAtk}
                                onChange={(event) => updateCharacter(characterIndex, "baseAtk", Number(event.target.value))}
                                slotProps={{ htmlInput: { min: 0 } }}
                            />
                            <TextField
                                label="HP"
                                type="number"
                                value={selectedCharacter.hp}
                                onChange={(event) => updateCharacter(characterIndex, "hp", Number(event.target.value))}
                                slotProps={{ htmlInput: { min: 0 } }}
                            />
                            {(["strength", "agility", "intellect", "will"] as const).map((attribute) => (
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
                                        value={enemy.attack}
                                        onChange={(event) =>
                                            updateEnemy(
                                                compositionIndex,
                                                enemyIndex,
                                                "attack",
                                                Number(event.target.value),
                                            )
                                        }
                                    />
                                    <TextField
                                        label="Defense"
                                        type="number"
                                        value={enemy.defense}
                                        onChange={(event) =>
                                            updateEnemy(
                                                compositionIndex,
                                                enemyIndex,
                                                "defense",
                                                Number(event.target.value),
                                            )
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
                <p>Gear bonuses are not applied to Combat Stats yet.</p>
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
                <section className="efcalc-panel">
                    <h2>Combat Stats</h2>
                    <p>Read-only placeholders; stat calculations will be added later.</p>
                    <div className="efcalc-fields efcalc-stat-fields">
                        {combatStatFields.map((field) => (
                            <TextField
                                key={field}
                                label={getCombatStatLabel(field)}
                                type="number"
                                value={combatStats[field]}
                                slotProps={{ htmlInput: { readOnly: true } }}
                            />
                        ))}
                    </div>
                </section>
                <section className="efcalc-panel">
                    <h2>Stage Modifiers</h2>
                    <p>External modifiers; they are not applied to Combat Stats yet.</p>
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
                        <p className="efcalc-result-note">Values below are attack multipliers, not calculated damage.</p>
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
