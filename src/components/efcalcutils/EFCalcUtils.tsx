import { useMemo, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import "../../assets/styles/EFCalcUtils.scss";
import charactersData from "./data/characters.json";
import enemyCompositionsData from "./data/enemies.json";

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
    atk: number;
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

function estimateDps(character: Character, enemy: Enemy): number {
    return 0;
}

function updateNumber<T extends Character | Enemy>(
    records: T[],
    index: number,
    field: keyof T,
    value: number,
    setRecords: (updated: T[]) => void,
) {
    setRecords(records.map((record, recordIndex) => (recordIndex === index ? { ...record, [field]: value } : record)));
}

function EFCalcUtils() {
    const [characterRecords, setCharacters] = useState<Character[]>(characters);
    const [compositions, setCompositions] = useState<EnemyComposition[]>(enemyCompositionsData);
    const [selectedCharacterId, setSelectedCharacterId] = useState(characters[0]?.id ?? "");
    const [selectedCompositionId, setSelectedCompositionId] = useState(enemyCompositionsData[0]?.id ?? "");

    const selectedCharacter = characterRecords.find((character) => character.id === selectedCharacterId);
    const selectedComposition = compositions.find((composition) => composition.id === selectedCompositionId);
    const averageDps = useMemo(() => {
        if (!selectedCharacter || !selectedComposition) {
            return 0;
        }

        if (selectedComposition.enemies.length === 0) {
            return 0;
        }

        return (
            selectedComposition.enemies.reduce((total, enemy) => total + estimateDps(selectedCharacter, enemy), 0) /
            selectedComposition.enemies.length
        );
    }, [selectedCharacter, selectedComposition]);

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
                                value={selectedCharacter.atk}
                                onChange={(event) => updateCharacter(characterIndex, "atk", Number(event.target.value))}
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

            <section className="efcalc-result" aria-live="polite">
                <div>
                    <p className="efcalc-eyebrow">STARTER ESTIMATE · AVERAGE PER TARGET</p>
                    <p className="efcalc-dps">{Math.round(averageDps).toLocaleString()} DPS</p>
                </div>
                <p className="efcalc-disclaimer">
                    Illustrative formula only. This is not yet an Endfield-accurate damage model.
                </p>
            </section>

            <p className="efcalc-next-steps">
                Next steps: add real operator and enemy data, then replace the starter estimate with the game’s damage
                rules. No buffs, rotations, or external data sources are included yet.
            </p>
        </main>
    );
}

export default EFCalcUtils;
