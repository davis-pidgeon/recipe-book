import { getGroceryData } from "@/lib/grocery/queries";
import { mondayOf, weekKey } from "@/lib/plan/week";
import WeekNav from "@/components/plan/WeekNav";
import GroceryLine from "@/components/grocery/GroceryLine";
import PantrySection from "@/components/grocery/PantrySection";
import ManualItems from "@/components/grocery/ManualItems";

export default async function GroceryPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const sp = await searchParams;
  const weekStartKey =
    (typeof sp.week === "string" ? sp.week : undefined) ?? weekKey(mondayOf(new Date()));
  const { built, manual } = await getGroceryData(weekStartKey);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl text-canyon">Grocery list</h1>
        <WeekNav weekStartKey={weekStartKey} basePath="/grocery" />
      </div>

      <section className="mt-6" data-testid="main-list">
        <h2 className="text-xl text-canyon">
          This week&rsquo;s list <span className="text-base font-normal text-ink/60">({built.main.length} items)</span>
        </h2>
        {built.main.length === 0 ? (
          <p className="mt-2 text-ink/70">
            Nothing to buy yet — add a recipe to this week&rsquo;s plan to build your list.
          </p>
        ) : (
          <div className="mt-3 divide-y divide-buttercream/50 rounded-2xl border-2 border-buttercream bg-card p-4">
            {built.main.map((line) => (
              <GroceryLine key={line.lineKey} weekStartKey={weekStartKey} line={line} />
            ))}
          </div>
        )}
      </section>

      <PantrySection weekStartKey={weekStartKey} lines={built.pantry} />

      <ManualItems weekStartKey={weekStartKey} items={manual} />
    </div>
  );
}
