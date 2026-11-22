import type { DamageBreakdown } from "./utils/combatDamage";

const numbers = new Intl.NumberFormat("en", { maximumFractionDigits: 2 });
const damageNumbers = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });
const factors = new Intl.NumberFormat("en", { maximumFractionDigits: 5 });
const factor = (value: number) => `×${factors.format(value)}`;
const percent = (value: number) => `${numbers.format(value)}%`;

function DetailRow({ label, value, note }: { label: string; value: string; note?: string }) {
    return (
        <div>
            <dt>{label}{note && <small>{note}</small>}</dt>
            <dd>{value}</dd>
        </div>
    );
}

export default function SimulationDamageDetails({
    source,
    breakdown,
}: {
    source: string;
    breakdown: DamageBreakdown;
}) {
    const { status, elementBonus, skillBonus, staggerBonus, baseResistance, resistanceReduction, critical } = breakdown;
    const aggregate = critical?.mode === "aggregate";
    const bonusSources = [
        `${breakdown.element} ${percent(elementBonus)}`,
        skillBonus !== 0 ? `Skill ${percent(skillBonus)}` : "",
        staggerBonus !== 0 ? `Against staggered targets ${percent(staggerBonus)}` : "",
        ...breakdown.artsDamageBonuses.map(({ label, percent: bonus }) => `${label} ${percent(bonus)}`),
    ].filter(Boolean).join(" · ");

    return (
        <section className="efcalc-damage-detail" aria-label="Damage breakdown">
            <div>
                <h5>Context</h5>
                <dl>
                    <DetailRow label="Damage target" value={breakdown.target} />
                    <DetailRow label="Source" value={source} />
                    <DetailRow label="Element" value={breakdown.element} />
                </dl>
                <h5>Result</h5>
                <dl>
                    <DetailRow label={aggregate ? "Expected damage" : "Hit damage"} value={damageNumbers.format(breakdown.damage)} />
                    {critical && (
                        <DetailRow label="Critical damage" value={damageNumbers.format(critical.critDamage)} />
                    )}
                    <DetailRow label="Non-crit damage" value={damageNumbers.format(critical?.nonCritDamage ?? breakdown.damage)} />
                </dl>
                <h5>Base damage</h5>
                <dl>
                    <DetailRow label="Attack" value={numbers.format(breakdown.attack)}
                        note={breakdown.attackBonus && `${breakdown.attackBonus.label} +${percent(breakdown.attackBonus.percent)}`} />
                    <DetailRow label="Multiplier per hit" value={percent(breakdown.perHitMultiplier)} />
                    <DetailRow label="Base damage" value={numbers.format(breakdown.baseDamage)} />
                </dl>
            </div>
            <div>
                <h5>Multipliers</h5>
                <dl>
                    <DetailRow label="Damage bonus" value={factor(breakdown.damageBonus)} note={bonusSources} />
                    {critical && (
                        <DetailRow
                            label={aggregate ? "Crit expectation" : "Critical hit multiplier"}
                            value={factor(critical.appliedFactor)}
                            note={aggregate
                                ? `${percent(critical.rate)} chance × ${percent(critical.bonus)} bonus`
                                : `${percent(critical.rate)} chance · ${percent(critical.bonus)} bonus · ${critical.didCrit ? "Critical hit" : "Normal hit"}`}
                        />
                    )}
                    <DetailRow label="Susceptibility" value={factor(breakdown.susceptibility)} note={percent(breakdown.susceptibilityBonus)} />
                    {breakdown.artsDamageTaken && (
                        <DetailRow label="Arts damage taken" value={factor(breakdown.damageTaken)}
                            note={`${breakdown.artsDamageTaken.label} +${percent(breakdown.artsDamageTaken.percent)}`} />
                    )}
                    <DetailRow label="Defense" value={factor(breakdown.defense)} note={`DEF ${numbers.format(breakdown.targetDefense)}`} />
                    <DetailRow label="Resistance" value={factor(breakdown.resistance)}
                        note={resistanceReduction ? `${percent(baseResistance)} − ${numbers.format(resistanceReduction)} pp` : percent(baseResistance)} />
                    <DetailRow label="Stagger" value={factor(breakdown.stagger)} />
                    {breakdown.finisher !== 1 && <DetailRow label="Finisher" value={factor(breakdown.finisher)} />}
                    {breakdown.potentialMultiplier !== 1 &&
                        <DetailRow label="Potential" value={factor(breakdown.potentialMultiplier)} />}
                    {status && (
                        <>
                            <DetailRow label="Level coefficient" value={factor(status.levelCoefficient)} note={`Level ${status.operatorLevel}`} />
                            <DetailRow label="Arts Intensity" value={factor(status.artsIntensityMultiplier)} note={`${numbers.format(status.artsIntensity)} pts`} />
                        </>
                    )}
                </dl>
            </div>
        </section>
    );
}
