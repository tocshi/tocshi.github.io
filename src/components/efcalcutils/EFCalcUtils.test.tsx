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
    window.localStorage.setItem(selectionsStorageKey, JSON.stringify({
        operatorId: "removed-operator",
        compositionId: "removed-enemy",
        operatorPotentials: { gilberta: 99 },
        equipment: { weapon: "opus-etch-figure", armor: "removed-armor" },
    }));

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

    fireEvent.change(screen.getByRole("combobox", { name: "Kit 2" }), { target: { value: "" } });
    expect(stats.getByLabelText("Battle Skill Damage Bonus")).toHaveValue("0%");
    expect(stats.getByLabelText("DEF")).toHaveValue("119");
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

    fireEvent.change(screen.getByRole("combobox", { name: "Weapon" }), { target: { value: "" } });
    expect(agility).toHaveValue("92");
    expect(physicalResistance).toHaveValue("8.42%");
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
