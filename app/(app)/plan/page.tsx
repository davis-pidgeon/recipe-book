import { getWeekPlan } from "@/lib/plan/queries";
import { mondayOf, weekKey } from "@/lib/plan/week";
import { listRecipes } from "@/lib/recipes/queries";
import WeekNav from "@/components/plan/WeekNav";
import PlanGrid from "@/components/plan/PlanGrid";

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const sp = await searchParams;
  const weekStartKey = sp.week ?? weekKey(mondayOf(new Date()));
  const { slots } = await getWeekPlan(weekStartKey);
  const data = slots.map((s) => ({
    dayIndex: s.dayIndex,
    slotKey: s.slotKey,
    label: s.label,
    sortOrder: s.sortOrder,
    note: s.note,
    recipe: s.recipe ? { id: s.recipe.id, title: s.recipe.title } : null,
  }));
  const recipeRows = await listRecipes({});
  const recipes = recipeRows.map((r) => ({
    id: r.id,
    title: r.title,
    tags: r.tags.map((t) => ({ id: t.id, name: t.name, group: t.group })),
  }));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl text-canyon">This week</h1>
        <WeekNav weekStartKey={weekStartKey} />
      </div>
      <div className="mt-6 overflow-x-auto">
        <PlanGrid weekStartKey={weekStartKey} slots={data} recipes={recipes} />
      </div>
    </div>
  );
}
