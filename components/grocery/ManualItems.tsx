"use client";
import { useState, useTransition } from "react";
import { addGroceryItem, removeGroceryItem, toggleItemChecked } from "@/lib/grocery/actions";
import type { GroceryItem } from "@prisma/client";

export default function ManualItems({
  weekStartKey,
  items,
}: {
  weekStartKey: string;
  items: GroceryItem[];
}) {
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setName("");
    startTransition(async () => {
      await addGroceryItem(weekStartKey, trimmed);
    });
  }

  return (
    <section className="mt-6 border-t-2 border-buttercream/50 pt-4" data-testid="manual-section">
      <h2 className="text-lg text-canyon/70">Add your own</h2>

      <div className="mt-3 flex items-end gap-2">
        <div className="flex-1">
          <label htmlFor="manual-item-name" className="block text-xs font-bold text-ink/60">
            Add a pantry item or snack
          </label>
          <input
            id="manual-item-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder="Add a pantry item or snack"
            className="mt-1 w-full rounded-xl border-2 border-buttercream bg-cream px-3 py-1.5 text-ink"
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={isPending}
          className="rounded-full bg-canyon px-4 py-1.5 font-bold text-cream disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {items.length > 0 && (
        <div className="mt-3 divide-y divide-buttercream/50 rounded-2xl border-2 border-buttercream bg-card p-4">
          {items.map((item) => (
            <ManualItem key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

function ManualItem({ item }: { item: GroceryItem }) {
  const [checked, setChecked] = useState(item.checked);
  const [prevServerChecked, setPrevServerChecked] = useState(item.checked);
  const [isPending, startTransition] = useTransition();

  // Server data is authoritative after a revalidation/reload — re-sync if it changes.
  // Adjusted during render (not an effect) to avoid an extra commit; see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  if (item.checked !== prevServerChecked) {
    setPrevServerChecked(item.checked);
    setChecked(item.checked);
  }

  function handleCheckedChange(next: boolean) {
    setChecked(next); // optimistic — flip immediately, persist in the background
    startTransition(async () => {
      await toggleItemChecked(item.id, next);
    });
  }

  function handleRemove() {
    startTransition(async () => {
      await removeGroceryItem(item.id);
    });
  }

  return (
    <div className="flex items-center gap-3 py-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => handleCheckedChange(e.target.checked)}
        aria-label={item.name}
        className="h-5 w-5 rounded border-2 border-buttercream accent-canyon"
      />
      <span className={`flex-1 ${checked ? "text-ink/50 line-through" : "text-ink"}`}>
        {item.name}
      </span>
      <button
        type="button"
        onClick={handleRemove}
        disabled={isPending}
        className="rounded-full border-2 border-buttercream px-2 py-0.5 text-xs font-bold text-olive disabled:opacity-50"
      >
        Remove
      </button>
    </div>
  );
}
