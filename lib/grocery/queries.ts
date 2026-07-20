import prisma from "@/lib/db";
import type { GroceryItem } from "@prisma/client";
import { parseWeekKey } from "@/lib/plan/week";
import { buildGroceryList, type SourceIngredient, type BuiltGrocery } from "./build";

export async function getGroceryData(
  weekStartKey: string,
): Promise<{ built: BuiltGrocery; manual: GroceryItem[] }> {
  const weekStart = parseWeekKey(weekStartKey);
  const slots = await prisma.planSlot.findMany({
    where: { weekStart, recipeId: { not: null } },
    include: { recipe: { include: { ingredients: { orderBy: { position: "asc" } } } } },
  });
  const sources: SourceIngredient[] = [];
  for (const slot of slots) {
    if (!slot.recipe) continue;
    for (const ing of slot.recipe.ingredients) {
      sources.push({
        planSlotId: slot.id,
        recipeId: slot.recipe.id,
        position: ing.position,
        quantity: ing.quantity,
        unit: ing.unit,
        name: ing.name,
        scale: slot.scale,
      });
    }
  }
  const flagRows = await prisma.groceryLineFlag.findMany({ where: { weekStart } });
  const flags = new Map(flagRows.map((f) => [f.lineKey, { checked: f.checked, pantry: f.pantry }]));
  const built = buildGroceryList(sources, flags);
  const manual = await prisma.groceryItem.findMany({ where: { weekStart }, orderBy: { createdAt: "asc" } });
  return { built, manual };
}
