import { getWeekPlan } from "@/lib/plan/queries";
import { mondayOf, weekKey } from "@/lib/plan/week";
import { computeEmptyCoords } from "@/lib/plan/slots";
import { listRecipes, listTags } from "@/lib/recipes/queries";
import WeekNav from "@/components/plan/WeekNav";
import PlanGrid from "@/components/plan/PlanGrid";
import SurpriseButton from "@/components/plan/SurpriseButton";

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
  const tags = await listTags();
  const emptyCoords = computeEmptyCoords(data);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl text-canyon">This week</h1>
        <div className="flex flex-wrap items-center justify-end gap-4">
          <WeekNav weekStartKey={weekStartKey} />
          <SurpriseButton
            weekStartKey={weekStartKey}
            emptyCoords={emptyCoords}
            tags={tags.map((t) => ({ id: t.id, name: t.name, group: t.group }))}
          />
        </div>
      </div>
      {slots.length === 0 && (
        <p className="mt-4 text-ink/70">
          Nothing planned yet — tap a slot to add a meal, or hit surprise me.
        </p>
      )}
      <div className="mt-6 overflow-x-auto">
        <PlanGrid weekStartKey={weekStartKey} slots={data} recipes={recipes} />
      </div>
    </div>
  );
}
