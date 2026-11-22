import { findGearStatWarnings } from "./gearStatValidation";
import { gearStatWarnings } from "../EFCalcUtils";

describe("findGearStatWarnings", () => {
    it("validates the current gear JSON against CharacterCombatStats", () => {
        expect(gearStatWarnings).toEqual([]);
    });

    it("returns no warnings when gear stats match combat stats", () => {
        const warnings = findGearStatWarnings(
            [{ category: "Weapon", items: [{ id: "weapon-1", name: "Sample Weapon", stats: { atk: 10, will: 5 } }] }],
            new Set(["atk", "will"]),
        );

        expect(warnings).toEqual([]);
    });

    it("reports unknown stat keys without blocking the gear item", () => {
        const warnings = findGearStatWarnings(
            [
                {
                    category: "Armor",
                    items: [{ id: "armor-1", name: "Sample Armor", stats: { def: 10, specialEffect: 5 } }],
                },
            ],
            new Set(["def"]),
        );

        expect(warnings).toEqual([{ category: "Armor", itemName: "Sample Armor", unknownKeys: ["specialEffect"] }]);
    });
});
