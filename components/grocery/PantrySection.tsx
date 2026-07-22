import GroceryLine from "@/components/grocery/GroceryLine";
import type { GroceryLine as GroceryLineType } from "@/lib/grocery/build";

export default function PantrySection({
  weekStartKey,
  lines,
}: {
  weekStartKey: string;
  lines: GroceryLineType[];
}) {
  if (lines.length === 0) return null;

  return (
    <section className="mt-6 border-t-2 border-buttercream/50 pt-4" data-testid="pantry-section">
      <h2 className="text-lg text-canyon/70">
        Pantry check <span className="text-sm font-normal text-ink/50">({lines.length} items)</span>
      </h2>
      <p className="mt-1 text-xs text-ink/50">
        Staples you probably already have — check your shelf before buying.
      </p>
      <div className="mt-3 divide-y divide-buttercream/30 rounded-2xl border-2 border-buttercream/50 bg-card/60 p-4 text-sm">
        {lines.map((line) => (
          <GroceryLine key={line.lineKey} weekStartKey={weekStartKey} line={line} variant="pantry" />
        ))}
      </div>
    </section>
  );
}
