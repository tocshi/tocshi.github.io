import { fireEvent, render, screen, within } from "@testing-library/react";
import EFCalcUtils from "./EFCalcUtils";

function equip(slot: string, itemName: string) {
    fireEvent.keyDown(screen.getByRole("combobox", { name: slot }), { key: "ArrowDown" });
    fireEvent.click(screen.getByRole("option", { name: itemName }));
}

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
