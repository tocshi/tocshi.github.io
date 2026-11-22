import { Fragment, useId, useState } from "react";
import type { FormEvent } from "react";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import type { Character, CharacterCombatStats, Enemy } from "./EFCalcUtils";
import { gilbertaActions, gilbertaEnergyCost } from "./charutils/gilbertaActions";
import { gilbertaRotation } from "./charutils/gilbertaRotation";
import { baseSPPerSecond, framesPerSecond, maxSP, simulateSolo, toFrames } from "./utils/simulation";
import type { SimulationResult } from "./utils/simulation";
import type { SimulationWeapon } from "./utils/weaponEffects";
import SimulationDamageDetails from "./SimulationDamageDetails";

const numberFormat = new Intl.NumberFormat("en", { maximumFractionDigits: 2 });
const damageFormat = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });
const format = (value: number) => numberFormat.format(value);

export default function SoloSimulationPanel({
    character,
    enemies,
    stats,
    potential,
    tideSurgeActive,
    weapon,
}: {
    character?: Character;
    enemies?: readonly Enemy[];
    stats: CharacterCombatStats;
    potential: number;
    tideSurgeActive: boolean;
    weapon?: SimulationWeapon;
}) {
    const [targetIndex, setTargetIndex] = useState(0);
    const [inputs, setInputs] = useState({
        startingSP: "200",
        startingEnergy: "0",
        spRecoveryBonus: "0",
        duration: "60",
    });
    const [logTimeUnit, setLogTimeUnit] = useState<"frames" | "seconds">("frames");
    const [hidePassiveSP, setHidePassiveSP] = useState(false);
    const [aggregateCriticalHits, setAggregateCriticalHits] = useState(false);
    const [expandedDamage, setExpandedDamage] = useState<ReadonlySet<number>>(() => new Set());
    const detailIdPrefix = useId();
    const [run, setRun] = useState<{ key: string; result?: SimulationResult; error?: string }>();
    const target = enemies?.[targetIndex];
    const energyCap = character ? gilbertaEnergyCost(character, potential) : 0;
    const fields = [
        { key: "startingSP", label: "Starting SP", min: 0, max: maxSP },
        { key: "startingEnergy", label: "Starting Ultimate Energy", min: 0, max: energyCap },
        { key: "spRecoveryBonus", label: "SP recovery modifier (%)", min: -100 },
        { key: "duration", label: "Duration (seconds)", min: 1, max: 600 },
    ] as const;
    const runKey = JSON.stringify([character, target, stats, potential, inputs, aggregateCriticalHits, tideSurgeActive, weapon]);
    const currentRun = run?.key === runKey ? run : undefined;
    const supported = character?.id === "gilberta" && Boolean(target);

    const runSimulation = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (character?.id !== "gilberta" || !target) return;
        const invalidField = fields.find(({ key, min, ...field }) => {
            const value = Number(inputs[key]);
            return (
                inputs[key] === "" || !Number.isFinite(value) || value < min || ("max" in field && value > field.max)
            );
        });
        if (invalidField) {
            const range =
                "max" in invalidField
                    ? `between ${invalidField.min} and ${invalidField.max}`
                    : `of at least ${invalidField.min}`;
            setRun({ key: runKey, error: `${invalidField.label} must be a number ${range}.` });
            return;
        }

        try {
            const result = simulateSolo({
                actions: gilbertaActions(character, stats, potential),
                policy: gilbertaRotation,
                enemy: target,
                stats,
                element: character.element,
                operatorLevel: 90,
                potential,
                durationFrames: toFrames(Number(inputs.duration)),
                startingSP: Number(inputs.startingSP),
                startingEnergy: Number(inputs.startingEnergy),
                spPerSecond: baseSPPerSecond * (1 + Number(inputs.spRecoveryBonus) / 100),
                aggregateCriticalHits,
                tideSurgeActive,
                weapon,
            });
            setExpandedDamage(new Set());
            setRun({ key: runKey, result });
        } catch (error) {
            setRun({ key: runKey, error: error instanceof Error ? error.message : "Simulation failed." });
        }
    };

    const result = currentRun?.result;
    const elapsed = result ? result.elapsedFrames / framesPerSecond : 0;
    const logEvents =
        result?.events.flatMap((entry, index) =>
            hidePassiveSP && entry.kind === "passiveSP" ? [] : [{ entry, index }],
        ) ?? [];

    const toggleDamage = (index: number) => {
        setExpandedDamage((current) => {
            const next = new Set(current);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    };

    return (
        <section className="efcalc-result efcalc-panel efcalc-simulation" aria-labelledby="efcalc-simulation-heading">
            <h2 id="efcalc-simulation-heading">Solo Simulation</h2>
            {supported ? (
                <>
                    <p>
                        Simulates the selected operator against a passive target. Gilberta’s Ultimate pauses effect
                        timers.
                    </p>
                    <form noValidate onSubmit={runSimulation}>
                        <div className="efcalc-fields">
                            {(enemies?.length ?? 0) > 1 && (
                                <TextField
                                    select
                                    label="Simulation target"
                                    value={targetIndex}
                                    onChange={(event) => setTargetIndex(Number(event.target.value))}
                                >
                                    {enemies?.map((enemy, index) => (
                                        <MenuItem key={index} value={index}>
                                            {enemy.name} (Lv. {enemy.level})
                                        </MenuItem>
                                    ))}
                                </TextField>
                            )}
                            {fields.map(({ key, label, min, ...field }) => (
                                <TextField
                                    key={key}
                                    label={label}
                                    type="number"
                                    value={inputs[key]}
                                    helperText={
                                        key === "spRecoveryBonus" ? `Baseline: ${baseSPPerSecond} SP/s` : undefined
                                    }
                                    slotProps={{ htmlInput: { min, ...field, step: "any" } }}
                                    onChange={(event) => setInputs({ ...inputs, [key]: event.target.value })}
                                />
                            ))}
                        </div>
                        <div className="efcalc-simulation-run-controls">
                            <Button type="submit" variant="contained">
                                Run simulation
                            </Button>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={aggregateCriticalHits}
                                        onChange={(_, checked) => setAggregateCriticalHits(checked)}
                                    />
                                }
                                label="Aggregate critical hits"
                            />
                        </div>
                    </form>
                </>
            ) : (
                <p>Select Gilberta and an enemy to run the simulation.</p>
            )}

            {currentRun?.error && <p role="alert">{currentRun.error}</p>}
            {result && (
                <div className="efcalc-simulation-results">
                    <h3>{target?.name} simulation results</h3>
                    {result.usedEstimatedTiming && <p>Demo timings. This run uses an estimated impact frame.</p>}
                    <dl>
                        <div>
                            <dt>Elapsed</dt>
                            <dd>{format(elapsed)} s</dd>
                        </div>
                        <div>
                            <dt>{aggregateCriticalHits ? "Total expected damage" : "Total damage"}</dt>
                            <dd>{format(result.totalDamage)}</dd>
                        </div>
                        <div>
                            <dt>DPS</dt>
                            <dd>{format(elapsed > 0 ? result.totalDamage / elapsed : 0)}</dd>
                        </div>
                        <div>
                            <dt>Remaining HP</dt>
                            <dd>{format(result.remainingHP)}</dd>
                        </div>
                    </dl>
                    <section aria-labelledby="efcalc-action-counts-heading">
                        <h4 id="efcalc-action-counts-heading">Action usage</h4>
                        <dl>
                            {result.actionCounts.map(({ id, label, count }) => (
                                <div key={id}>
                                    <dt>{label}</dt>
                                    <dd>{count}</dd>
                                </div>
                            ))}
                        </dl>
                    </section>
                    <section aria-labelledby="efcalc-hit-counts-heading">
                        <h4 id="efcalc-hit-counts-heading">Total hits</h4>
                        <dl>
                            {result.hitCounts.map(({ id, label, multiplier, count, criticalCount }) => (
                                <div key={id}>
                                    <dt>{label} ({format(multiplier)}%)</dt>
                                    <dd>{count}</dd>
                                    {!aggregateCriticalHits && (
                                        <dd className="efcalc-critical-hit">{criticalCount} {criticalCount === 1 ? "crit" : "crits"}</dd>
                                    )}
                                </div>
                            ))}
                        </dl>
                    </section>
                    <details>
                        <summary>Event log ({logEvents.length})</summary>
                        <div className="efcalc-simulation-log-controls">
                            <TextField
                                select
                                size="small"
                                label="Time unit"
                                value={logTimeUnit}
                                onChange={(event) =>
                                    setLogTimeUnit(event.target.value === "seconds" ? "seconds" : "frames")
                                }
                            >
                                <MenuItem value="frames">Frames</MenuItem>
                                <MenuItem value="seconds">Seconds</MenuItem>
                            </TextField>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={hidePassiveSP}
                                        onChange={(_, checked) => setHidePassiveSP(checked)}
                                    />
                                }
                                label="Hide passive SP recovery"
                            />
                        </div>
                        <div className="efcalc-simulation-log">
                            <table>
                                <thead>
                                    <tr>
                                        <th>{logTimeUnit === "frames" ? "Frame" : "Time (s)"}</th>
                                        <th>Event</th>
                                        <th>Damage</th>
                                        <th>SP</th>
                                        <th>Energy</th>
                                        <th>Stagger</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logEvents.map(({ entry, index }) => {
                                        const { frame, event, damageBreakdown, sp, ultimateEnergy, enemyStagger } =
                                            entry;
                                        const expanded = expandedDamage.has(index);
                                        const detailId = `${detailIdPrefix}-damage-${index}`;
                                        return (
                                            <Fragment key={index}>
                                                <tr
                                                    className={
                                                        damageBreakdown?.critical?.didCrit
                                                            ? "efcalc-critical-hit"
                                                            : undefined
                                                    }
                                                >
                                                    <td>
                                                        {logTimeUnit === "frames"
                                                            ? frame
                                                            : format(frame / framesPerSecond)}
                                                    </td>
                                                    <td>{event}</td>
                                                    <td>
                                                        {damageBreakdown && (
                                                            <button
                                                                className="efcalc-damage-toggle"
                                                                type="button"
                                                                aria-label={`Damage breakdown for ${event} at frame ${frame}: ${damageFormat.format(damageBreakdown.damage)} damage`}
                                                                aria-expanded={expanded}
                                                                aria-controls={expanded ? detailId : undefined}
                                                                onClick={() => toggleDamage(index)}
                                                            >
                                                                {damageFormat.format(damageBreakdown.damage)}
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td>{format(sp)}</td>
                                                    <td>{format(ultimateEnergy)}</td>
                                                    <td>
                                                        {result.maxStagger
                                                            ? `${format(enemyStagger)}/${format(result.maxStagger)}`
                                                            : "—"}
                                                    </td>
                                                </tr>
                                                {expanded && damageBreakdown && (
                                                    <tr className="efcalc-damage-detail-row">
                                                        <td id={detailId} colSpan={6}>
                                                            <SimulationDamageDetails
                                                                source={event}
                                                                breakdown={damageBreakdown}
                                                            />
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </details>
                </div>
            )}
        </section>
    );
}
