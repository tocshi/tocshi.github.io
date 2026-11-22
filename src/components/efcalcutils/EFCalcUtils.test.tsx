import { fireEvent, render, screen, within } from "@testing-library/react";
import EFCalcUtils from "./EFCalcUtils";

const selectionsStorageKey = "efcalc.selections.v1";

beforeEach(() => window.localStorage.removeItem(selectionsStorageKey));

function equip(slot: string, itemName: string) {
    fireEvent.keyDown(screen.getByRole("combobox", { name: slot }), { key: "ArrowDown" });
    fireEvent.click(screen.getByRole("option", { name: itemName }));
}

test("restores equipment and Potential on refresh and keeps cleared slots empty", () => {
    const equipment = [
        ["Weapon", "Opus: Etch Figure"],
        ["Armor", "Tide Fall Light Armor T1"],
        ["Gloves", "Hot Work Gauntlets T1"],
        ["Kit 1", "Turbid Cutting Torch T1"],
        ["Kit 2", "Turbid Cutting Torch T1"],
    ];
    const original = render(<EFCalcUtils />);
    equipment.forEach(([slot, item]) => equip(slot, item));
    fireEvent.change(screen.getByRole("spinbutton", { name: "Potential" }), { target: { value: "3" } });
    original.unmount();

    const refreshed = render(<EFCalcUtils />);
    expect(screen.getByRole("combobox", { name: "Operator" })).toHaveValue("Gilberta");
    expect(screen.getByRole("combobox", { name: "Enemy" })).toHaveValue("Rhodagn the Bonekrushing Fist lv90");
    expect(screen.getByRole("spinbutton", { name: "Potential" })).toHaveValue(3);
    equipment.forEach(([slot, item]) => expect(screen.getByRole("combobox", { name: slot })).toHaveValue(item));

    fireEvent.change(screen.getByRole("combobox", { name: "Kit 2" }), { target: { value: "" } });
    refreshed.unmount();
    render(<EFCalcUtils />);
    expect(screen.getByRole("combobox", { name: "Kit 2" })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Kit 1" })).toHaveValue("Turbid Cutting Torch T1");
});

test("recovers valid selections alongside stale or invalid saved values", () => {
    window.localStorage.setItem(
        selectionsStorageKey,
        JSON.stringify({
            operatorId: "removed-operator",
            compositionId: "removed-enemy",
            operatorPotentials: { gilberta: 99 },
            equipment: { weapon: "opus-etch-figure", armor: "removed-armor" },
        }),
    );

    render(<EFCalcUtils />);
    expect(screen.getByRole("combobox", { name: "Operator" })).toHaveValue("Gilberta");
    expect(screen.getByRole("combobox", { name: "Enemy" })).toHaveValue("Rhodagn the Bonekrushing Fist lv90");
    expect(screen.getByRole("spinbutton", { name: "Potential" })).toHaveValue(0);
    expect(screen.getByRole("combobox", { name: "Weapon" })).toHaveValue("Opus: Etch Figure");
    expect(screen.getByRole("combobox", { name: "Armor" })).toHaveValue("");
});

test("calculates Gilberta's stats from the selected weapon and every equipped slot", () => {
    render(<EFCalcUtils />);
    const stats = within(screen.getByRole("region", { name: "Combat Stats" }));
    expect(stats.getByLabelText("HP")).toHaveValue("5940");
    expect(stats.getByLabelText("Crit Rate")).toHaveValue("5%");
    expect(stats.getByLabelText("ATK")).toHaveValue("792");
    expect(stats.getByLabelText("ATK")).toHaveAttribute("readonly");

    equip("Weapon", "Opus: Etch Figure");
    equip("Armor", "Tide Fall Light Armor T1");
    equip("Gloves", "Hot Work Gauntlets T1");
    equip("Kit 1", "Turbid Cutting Torch T1");
    expect(stats.getByLabelText("Battle Skill Damage Bonus")).toHaveValue("0%");

    equip("Kit 2", "Turbid Cutting Torch T1");
    expect(stats.getByLabelText("ATK")).toHaveValue("4628");
    expect(stats.getByLabelText("DEF")).toHaveValue("140");
    expect(stats.getByLabelText("Nature Resistance")).toHaveValue("27.38%");
    expect(stats.getByLabelText("Treatment Received Bonus")).toHaveValue("60%");
    expect(stats.getByLabelText("Nature Damage Bonus")).toHaveValue("128.1%");
    expect(stats.getByLabelText("Basic Attack Damage Bonus")).toHaveValue("0%");
    expect(stats.getByLabelText("Battle Skill Damage Bonus")).toHaveValue("20%");
    expect(stats.getByLabelText("Combo Skill Damage Bonus")).toHaveValue("20%");
    expect(stats.getByLabelText("Ultimate Skill Damage Bonus")).toHaveValue("20%");
    const damage = within(screen.getByRole("region", { name: "Attack Damage Calculations" }));
    for (const value of ["3589", "2164 × 2", "1583 × 3", "1953 × 3", "3157 × 4", "7462"]) {
        expect(damage.getByText(value)).toBeInTheDocument();
    }

    const simulation = within(screen.getByRole("region", { name: "Solo Simulation" }));
    fireEvent.change(simulation.getByRole("spinbutton", { name: "Duration (seconds)" }), { target: { value: "10" } });
    fireEvent.click(simulation.getByRole("button", { name: "Run simulation" }));
    expect(simulation.getByText("Tide Surge activated")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox", { name: "Kit 2" }), { target: { value: "" } });
    expect(stats.getByLabelText("Battle Skill Damage Bonus")).toHaveValue("0%");
    expect(stats.getByLabelText("DEF")).toHaveValue("119");
    fireEvent.click(simulation.getByRole("button", { name: "Run simulation" }));
    expect(simulation.queryByText("Tide Surge activated")).toBeNull();
});

test("displays Ultimate Gain Efficiency including its 100% baseline", () => {
    render(<EFCalcUtils />);
    const stats = within(screen.getByRole("region", { name: "Combat Stats" }));
    const efficiency = stats.getByLabelText("Ultimate Gain Efficiency");
    const potential = screen.getByRole("spinbutton", { name: "Potential" });

    expect(efficiency).toHaveValue("107%");
    equip("Armor", "Tide Fall Light Armor T1");
    fireEvent.change(potential, { target: { value: "3" } });
    expect(efficiency).toHaveValue("128%");
    fireEvent.change(potential, { target: { value: "5" } });
    expect(efficiency).toHaveValue("128%");
    fireEvent.change(potential, { target: { value: "2" } });
    expect(efficiency).toHaveValue("123%");
});

test("updates Agility and Physical Resistance when an Agility weapon is equipped or removed", () => {
    render(<EFCalcUtils />);
    const stats = within(screen.getByRole("region", { name: "Combat Stats" }));
    const agility = stats.getByLabelText("Agility");
    const physicalResistance = stats.getByLabelText("Physical Resistance");

    expect(agility).toHaveValue("92");
    expect(physicalResistance).toHaveValue("8.42%");

    equip("Weapon", "Umbra of Frigid Eventide");
    expect(agility).toHaveValue("248");
    expect(physicalResistance).toHaveValue("19.87%");
    expect(stats.getByLabelText("ATK")).toHaveValue("2792");
    for (const element of ["Heat", "Electric", "Cryo", "Nature"]) {
        expect(stats.getByLabelText(`${element} Damage Bonus`)).toHaveValue("25.6%");
    }
    expect(stats.getByLabelText("Physical Damage Bonus")).toHaveValue("0%");

    equip("Gloves", "Hot Work Gauntlets T1");
    expect(stats.getByLabelText("Heat Damage Bonus")).toHaveValue("50.5%");
    expect(stats.getByLabelText("Nature Damage Bonus")).toHaveValue("50.5%");
    expect(stats.getByLabelText("Electric Damage Bonus")).toHaveValue("25.6%");

    fireEvent.change(screen.getByRole("combobox", { name: "Weapon" }), { target: { value: "" } });
    expect(agility).toHaveValue("92");
    expect(physicalResistance).toHaveValue("8.42%");
    expect(stats.getByLabelText("Nature Damage Bonus")).toHaveValue("24.9%");
});

test("shows the active trust bonus and applies it alongside editable base stats", () => {
    render(<EFCalcUtils />);
    const baseStats = within(screen.getByRole("region", { name: "Operator base stats" }));
    const stats = within(screen.getByRole("region", { name: "Combat Stats" }));
    const trustWill = baseStats.getByRole("spinbutton", { name: "Trust Will" });

    expect(trustWill).toHaveValue(60);
    expect(trustWill).toHaveAttribute("readonly");
    expect(stats.getByLabelText("Will")).toHaveValue("231");

    fireEvent.change(baseStats.getByRole("spinbutton", { name: "Will" }), { target: { value: "181" } });
    expect(stats.getByLabelText("Will")).toHaveValue("241");
    expect(stats.getByLabelText("ATK")).toHaveValue("809");
});

test("shows non-crit damage per hit, including boss finishers and Gilberta's Potential 5", () => {
    render(<EFCalcUtils />);
    const damage = within(screen.getByRole("region", { name: "Attack Damage Calculations" }));

    expect(damage.getByText("162 × 2")).toBeInTheDocument();
    expect(damage.getByText("218 × 4")).toBeInTheDocument();
    expect(damage.getByText("8114")).toBeInTheDocument();
    expect(damage.getByText("1248")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("spinbutton", { name: "Potential" }), { target: { value: "5" } });
    expect(damage.getByText("1623")).toBeInTheDocument();
    expect(damage.queryByText("1248")).toBeNull();
});

test("recalculates per-hit damage from enemy defenses and offensive stage modifiers", () => {
    render(<EFCalcUtils />);
    const enemy = within(screen.getByRole("region", { name: "Enemy composition" }));
    const stage = within(screen.getByRole("region", { name: "Stage Modifiers" }));
    const stats = within(screen.getByRole("region", { name: "Combat Stats" }));
    const damage = within(screen.getByRole("region", { name: "Attack Damage Calculations" }));

    fireEvent.change(enemy.getByRole("spinbutton", { name: "DEF" }), { target: { value: "0" } });
    fireEvent.change(enemy.getByRole("spinbutton", { name: "Nature resistance" }), { target: { value: "25" } });
    fireEvent.change(stage.getByRole("spinbutton", { name: "ATK Bonus (%)" }), { target: { value: "10" } });
    fireEvent.change(stage.getByRole("spinbutton", { name: "Nature Damage Bonus" }), { target: { value: "20" } });
    fireEvent.change(stage.getByRole("spinbutton", { name: "Basic Attack Damage Bonus" }), { target: { value: "10" } });
    fireEvent.change(stage.getByRole("spinbutton", { name: "Crit Rate" }), { target: { value: "100" } });

    expect(damage.getByText("349 × 2")).toBeInTheDocument();
    expect(stats.getByLabelText("ATK")).toHaveValue("792");
});

function enableOpeningUltimate() {
    const stage = within(screen.getByRole("region", { name: "Stage Modifiers" }));
    fireEvent.change(stage.getByRole("spinbutton", { name: "Ultimate Gain Efficiency" }), { target: { value: "200" } });
}

test("uses the selected weapon's conditional effects and ignores stage attributes for Phalanx's branch", () => {
    render(<EFCalcUtils />);
    equip("Weapon", "Type 42: Solemn Phalanx");
    const stage = within(screen.getByRole("region", { name: "Stage Modifiers" }));
    fireEvent.change(stage.getByRole("spinbutton", { name: "Will" }), { target: { value: "200" } });
    const simulation = within(screen.getByRole("region", { name: "Solo Simulation" }));
    const run = simulation.getByRole("button", { name: "Run simulation" });
    fireEvent.change(simulation.getByRole("spinbutton", { name: "Duration (seconds)" }), { target: { value: "9" } });
    fireEvent.click(run);
    fireEvent.click(simulation.getByText(/^Event log/));
    expect(simulation.getByText("Debilitating Assault (Arts DMG Dealt) activated")).toBeInTheDocument();

    equip("Weapon", "Umbra of Frigid Eventide");
    expect(simulation.queryByText("Total damage")).toBeNull();
    fireEvent.click(run);
    fireEvent.click(simulation.getByText(/^Event log/));
    expect(simulation.getByText("Windform activated")).toBeInTheDocument();
    fireEvent.click(simulation.getByRole("button", { name: /Damage breakdown for Nature Burst( critical hit)? at frame/ }));
    const details = within(simulation.getByRole("region", { name: "Damage breakdown" }));
    expect(details.getByText(/Nature 25.6%.*Hunter Instinct 6.4%/)).toBeInTheDocument();
    expect(details.getByText("56 pts")).toBeInTheDocument();
});

test("runs the selected loadout with configurable starting resources", () => {
    render(<EFCalcUtils />);
    enableOpeningUltimate();
    const simulation = within(screen.getByRole("region", { name: "Solo Simulation" }));
    const startingEnergy = simulation.getByRole("spinbutton", { name: "Starting Ultimate Energy" });
    const run = simulation.getByRole("button", { name: "Run simulation" });

    fireEvent.change(startingEnergy, { target: { value: "91" } });
    fireEvent.click(run);
    expect(simulation.getByRole("alert")).toHaveTextContent("between 0 and 90");

    fireEvent.change(startingEnergy, { target: { value: "90" } });
    fireEvent.change(simulation.getByRole("spinbutton", { name: "Starting SP" }), { target: { value: "0" } });
    fireEvent.change(simulation.getByRole("spinbutton", { name: "SP recovery modifier (%)" }), { target: { value: "-100" } });
    fireEvent.change(simulation.getByRole("spinbutton", { name: "Duration (seconds)" }), { target: { value: "3" } });
    fireEvent.click(run);

    expect(simulation.getByText("Total damage")).toBeInTheDocument();
    expect(simulation.getByText("Ultimate started")).toBeInTheDocument();
    expect(simulation.queryByText("Battle Skill started")).toBeNull();
});

test("shows action counts and lets users switch log units and hide passive recovery", () => {
    render(<EFCalcUtils />);
    enableOpeningUltimate();
    const simulation = within(screen.getByRole("region", { name: "Solo Simulation" }));
    fireEvent.change(simulation.getByRole("spinbutton", { name: "Starting Ultimate Energy" }), { target: { value: "90" } });
    fireEvent.change(simulation.getByRole("spinbutton", { name: "Starting SP" }), { target: { value: "0" } });
    fireEvent.change(simulation.getByRole("spinbutton", { name: "SP recovery modifier (%)" }), { target: { value: "25" } });
    fireEvent.change(simulation.getByRole("spinbutton", { name: "Duration (seconds)" }), { target: { value: "3" } });
    fireEvent.click(simulation.getByRole("button", { name: "Run simulation" }));

    const counts = within(simulation.getByRole("region", { name: "Action usage" }));
    expect(counts.getByText("Ultimate").nextElementSibling).toHaveTextContent("1");
    expect(counts.getByText("Battle Skill").nextElementSibling).toHaveTextContent("0");

    fireEvent.click(simulation.getByText(/^Event log/));
    const hit = within(simulation.getByRole("row", { name: /Ultimate (critical )?hit/ }));
    expect(hit.getAllByRole("cell")[0]).toHaveTextContent(/^120$/);
    expect(hit.getAllByRole("cell")[3]).toHaveTextContent(/^20$/);
    expect(simulation.getAllByText(/^Passive SP recovered/).length).toBeGreaterThan(0);

    const toggle = hit.getByRole("button", { name: /Damage breakdown/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(simulation.queryByRole("region", { name: "Damage breakdown" })).toBeNull();
    fireEvent.click(toggle);
    const detail = within(simulation.getByRole("region", { name: "Damage breakdown" }));
    expect(detail.getByText("Rhodagn the Bonekrushing Fist")).toBeInTheDocument();
    expect(detail.getByText("750%")).toBeInTheDocument();
    expect(detail.getByText("×0.5")).toBeInTheDocument();
    expect(detail.getByText("Hit damage").nextElementSibling).toHaveTextContent(toggle.textContent ?? "");
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    fireEvent.mouseDown(simulation.getByRole("combobox", { name: "Time unit" }));
    fireEvent.click(screen.getByRole("option", { name: "Seconds" }));
    expect(simulation.getByRole("columnheader", { name: "Time (s)" })).toBeInTheDocument();
    expect(hit.getAllByRole("cell")[0]).toHaveTextContent(/^2$/);

    fireEvent.click(simulation.getByRole("checkbox", { name: "Hide passive SP recovery" }));
    expect(simulation.queryByText(/^Passive SP recovered/)).toBeNull();
    expect(hit.getByText(/Ultimate (critical )?hit/)).toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(counts.getByText("Ultimate").nextElementSibling).toHaveTextContent("1");
    fireEvent.click(toggle);
    expect(simulation.queryByRole("region", { name: "Damage breakdown" })).toBeNull();
});

test("shows stagger and expected damage in aggregate mode, and highlights rolled critical hits", () => {
    render(<EFCalcUtils />);
    enableOpeningUltimate();
    const simulation = within(screen.getByRole("region", { name: "Solo Simulation" }));
    const aggregate = simulation.getByRole("checkbox", { name: "Aggregate critical hits" });
    const run = simulation.getByRole("button", { name: "Run simulation" });
    fireEvent.change(simulation.getByRole("spinbutton", { name: "Starting Ultimate Energy" }), { target: { value: "90" } });
    fireEvent.change(simulation.getByRole("spinbutton", { name: "Duration (seconds)" }), { target: { value: "3" } });
    fireEvent.click(aggregate);
    fireEvent.click(run);
    expect(simulation.getByText("Total expected damage")).toBeInTheDocument();
    const usage = within(simulation.getByRole("region", { name: "Action usage" }));
    expect(usage.getByText("Dive Attack").nextElementSibling).toHaveTextContent(/^0$/);
    const hitCounts = within(simulation.getByRole("region", { name: "Total hits" }));
    expect(hitCounts.getByText("Dive Attack (180%)").nextElementSibling).toHaveTextContent(/^0$/);
    expect(hitCounts.getByText("Ultimate (750%)").nextElementSibling).toHaveTextContent(/^1$/);
    expect(hitCounts.queryByText(/crits?$/)).toBeNull();

    fireEvent.click(simulation.getByText(/^Event log/));
    const hit = within(simulation.getByRole("row", { name: /Ultimate hit/ }));
    expect(hit.getByText("20/280")).toBeInTheDocument();
    fireEvent.click(hit.getByRole("button", { name: /Damage breakdown/ }));
    const detail = within(simulation.getByRole("region", { name: "Damage breakdown" }));
    expect(detail.getByText("Expected damage")).toBeInTheDocument();
    expect(detail.getByText("Critical damage")).toBeInTheDocument();
    expect(detail.getByText("×1.025")).toBeInTheDocument();

    const stage = within(screen.getByRole("region", { name: "Stage Modifiers" }));
    fireEvent.change(stage.getByRole("spinbutton", { name: "Crit Rate" }), { target: { value: "95" } });
    fireEvent.click(aggregate);
    fireEvent.click(run);
    const criticalCounts = within(simulation.getByRole("region", { name: "Total hits" }));
    expect(criticalCounts.getByText("Ultimate (750%)").nextElementSibling?.nextElementSibling)
        .toHaveClass("efcalc-critical-hit");
    expect(criticalCounts.getByText("1 crit")).toBeInTheDocument();
    fireEvent.click(simulation.getByText(/^Event log/));
    const critical = simulation.getByRole("row", { name: /Ultimate critical hit/ });
    expect(critical).toHaveClass("efcalc-critical-hit");
    fireEvent.click(within(critical).getByRole("button", { name: /Damage breakdown/ }));
    expect(within(simulation.getByRole("region", { name: "Damage breakdown" })).getByText("×1.5")).toBeInTheDocument();
});
