"use server";
import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { parseWeekKey } from "./week";
import { pickRandom } from "./surprise";
import { customSlotKey } from "./customSlotKey";
import { buildRecipeWhere, type RecipeFilters } from "@/lib/recipes/filters";
// Note: customSlotKey is intentionally NOT exported from this file. Every
// export from a file-level "use server" module is treated as a Server
// Function reference by Next 16, which requires it to be async — a plain
// sync helper here trips a build error. Consumers (incl. this file's own
// test) import it directly from "./customSlotKey".

async function upsertSlot(
  weekKey: string,
  dayIndex: number,
  slotKey: string,
  label: string,
  sortOrder: number,
  data: { recipeId?: string | null; note?: string | null; scale?: number },
) {
  const weekStart = parseWeekKey(weekKey);
  await prisma.planSlot.upsert({
    where: { weekStart_dayIndex_slotKey: { weekStart, dayIndex, slotKey } },
    update: { label, sortOrder, ...data },
    create: { weekStart, dayIndex, slotKey, label, sortOrder, ...data },
  });
  revalidatePath("/plan");
}

export async function setSlotRecipe(
  weekKey: string,
  dayIndex: number,
  slotKey: string,
  label: string,
  sortOrder: number,
  recipeId: string,
  scale: number,
) {
  await upsertSlot(weekKey, dayIndex, slotKey, label, sortOrder, {
    recipeId,
    note: null,
    scale,
  });
}

export async function setSlotNote(
  weekKey: string,
  dayIndex: number,
  slotKey: string,
  label: string,
  sortOrder: number,
  note: string,
) {
  await upsertSlot(weekKey, dayIndex, slotKey, label, sortOrder, {
    note,
    recipeId: null,
    scale: 1,
  });
}

export async function clearSlot(weekKey: string, dayIndex: number, slotKey: string) {
  const weekStart = parseWeekKey(weekKey);
  await prisma.planSlot.deleteMany({ where: { weekStart, dayIndex, slotKey } });
  revalidatePath("/plan");
}

export async function addCustomSlot(weekKey: string, dayIndex: number, label: string) {
  const trimmed = label.trim();
  if (!trimmed) return;
  await upsertSlot(weekKey, dayIndex, customSlotKey(), trimmed, 100, {});
}

export async function removeCustomSlot(weekKey: string, dayIndex: number, slotKey: string) {
  await clearSlot(weekKey, dayIndex, slotKey);
}

export async function surpriseFill(
  weekKey: string,
  emptyCoords: { dayIndex: number; slotKey: string; label: string; sortOrder: number }[],
  filters: RecipeFilters,
) {
  const where = { AND: [buildRecipeWhere(filters), { dislike: false }] };
  const eligible = await prisma.recipe.findMany({ where, select: { id: true } });
  const picks = pickRandom(eligible, emptyCoords.length);
  const weekStart = parseWeekKey(weekKey);
  await prisma.$transaction(
    picks.map((r, i) => {
      const c = emptyCoords[i];
      return prisma.planSlot.upsert({
        where: {
          weekStart_dayIndex_slotKey: {
            weekStart,
            dayIndex: c.dayIndex,
            slotKey: c.slotKey,
          },
        },
        update: {
          label: c.label,
          sortOrder: c.sortOrder,
          recipeId: r.id,
          note: null,
          scale: 1,
        },
        create: {
          weekStart,
          dayIndex: c.dayIndex,
          slotKey: c.slotKey,
          label: c.label,
          sortOrder: c.sortOrder,
          recipeId: r.id,
          scale: 1,
        },
      });
    }),
  );
  revalidatePath("/plan");
}
