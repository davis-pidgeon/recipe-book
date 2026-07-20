"use server";
import prisma from "@/lib/db";
import { parseWeekKey } from "@/lib/plan/week";
import { revalidatePath } from "next/cache";

export async function toggleLineChecked(weekKey: string, lineKey: string, checked: boolean): Promise<void> {
  const weekStart = parseWeekKey(weekKey);
  await prisma.groceryLineFlag.upsert({
    where: { weekStart_lineKey: { weekStart, lineKey } },
    update: { checked },
    create: { weekStart, lineKey, checked },
  });
  revalidatePath("/grocery");
}

export async function toggleLinePantry(weekKey: string, lineKey: string, pantry: boolean): Promise<void> {
  const weekStart = parseWeekKey(weekKey);
  await prisma.groceryLineFlag.upsert({
    where: { weekStart_lineKey: { weekStart, lineKey } },
    update: { pantry },
    create: { weekStart, lineKey, pantry },
  });
  revalidatePath("/grocery");
}

export async function addGroceryItem(weekKey: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  const weekStart = parseWeekKey(weekKey);
  await prisma.groceryItem.create({ data: { weekStart, name: trimmed } });
  revalidatePath("/grocery");
}

export async function toggleItemChecked(id: string, checked: boolean): Promise<void> {
  await prisma.groceryItem.update({ where: { id }, data: { checked } });
  revalidatePath("/grocery");
}

export async function removeGroceryItem(id: string): Promise<void> {
  await prisma.groceryItem.delete({ where: { id } });
  revalidatePath("/grocery");
}
