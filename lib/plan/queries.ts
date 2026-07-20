import prisma from "@/lib/db";
import { parseWeekKey } from "./week";

export async function getWeekPlan(weekStartKey: string) {
  const weekStart = parseWeekKey(weekStartKey);
  const slots = await prisma.planSlot.findMany({
    where: { weekStart },
    include: { recipe: { select: { id: true, title: true } } },
    orderBy: [{ dayIndex: "asc" }, { sortOrder: "asc" }],
  });
  return { weekStart, slots };
}
