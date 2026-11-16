export interface GearStatSource {
    category: string;
    items: readonly {
        id: string;
        name: string;
        stats: Record<string, number>;
    }[];
}

export interface GearStatWarning {
    category: string;
    itemName: string;
    unknownKeys: string[];
}

export function findGearStatWarnings(
    sources: readonly GearStatSource[],
    combatStatKeys: ReadonlySet<string>,
): GearStatWarning[] {
    return sources.flatMap(({ category, items }) =>
        items.flatMap((item) => {
            const unknownKeys = Object.keys(item.stats).filter((key) => !combatStatKeys.has(key));
            return unknownKeys.length > 0 ? [{ category, itemName: item.name, unknownKeys }] : [];
        }),
    );
}
