import { scaleQuantity, formatQuantity } from "@/lib/recipes/scale";
import { isPantryStaple } from "./pantry";
import { lineKey } from "./lineKey";

export type SourceIngredient = {
  planSlotId: string; recipeId: string; position: number;
  quantity: number | null; unit: string | null; name: string; scale: number;
};
export type GroceryLine = { lineKey: string; display: string; name: string; checked: boolean };
export type BuiltGrocery = { main: GroceryLine[]; pantry: GroceryLine[] };

export function buildGroceryList(
  sources: SourceIngredient[],
  flags: Map<string, { checked: boolean; pantry: boolean | null }>,
): BuiltGrocery {
  const main: GroceryLine[] = [];
  const pantry: GroceryLine[] = [];

  for (const s of sources) {
    const key = lineKey(s.planSlotId, s.recipeId, s.position);
    const scaled = scaleQuantity(s.quantity, s.scale);
    const display = [formatQuantity(scaled), s.unit, s.name].filter(Boolean).join(" ");
    const flag = flags.get(key);
    const line: GroceryLine = { lineKey: key, display, name: s.name, checked: flag?.checked ?? false };
    const override = flag?.pantry; // true | false | null | undefined
    const isPantry = override === null || override === undefined ? isPantryStaple(s.name) : override;
    if (isPantry) pantry.push(line);
    else main.push(line);
  }

  const byName = (a: GroceryLine, b: GroceryLine) => a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  main.sort(byName);
  pantry.sort(byName);
  return { main, pantry };
}
