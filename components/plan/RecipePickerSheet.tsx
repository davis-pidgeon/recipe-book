"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { setSlotRecipe } from "@/lib/plan/actions";
import { isWeekend } from "@/lib/plan/slots";
import NoteEditor from "./NoteEditor";

export type RecipeOption = {
  id: string;
  title: string;
  tags: { id: string; name: string; group: string }[];
};

export type RecipePickerSheetProps = {
  weekStartKey: string;
  dayIndex: number;
  slotKey: string;
  label: string;
  sortOrder: number;
  initialNote: string | null;
  initialScale?: number;
  initialRecipeId?: string | null;
  recipes: RecipeOption[];
  onClose: () => void;
};

const SCALES = [1, 2, 3];

function baseMeal(label: string): "breakfast" | "lunch" | "dinner" | null {
  const l = label.toLowerCase();
  if (l.startsWith("breakfast")) return "breakfast";
  if (l.startsWith("lunch")) return "lunch";
  if (l.startsWith("dinner")) return "dinner";
  return null;
}

export default function RecipePickerSheet({
  weekStartKey,
  dayIndex,
  slotKey,
  label,
  sortOrder,
  initialNote,
  initialScale,
  initialRecipeId,
  recipes,
  onClose,
}: RecipePickerSheetProps) {
  const [mode, setMode] = useState<"recipe" | "note">("recipe");
  const [query, setQuery] = useState("");
  const [scale, setScale] = useState(initialScale ?? 1);
  const [isPending, startTransition] = useTransition();
  const closeRef = useRef<HTMLButtonElement>(null);

  const meal = baseMeal(label);
  const biasTagName = meal ? `${isWeekend(dayIndex) ? "Weekend" : "Work"} ${meal}` : null;
  const [biasActive, setBiasActive] = useState(Boolean(biasTagName));

  useEffect(() => {
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    let list = recipes;
    if (biasActive && biasTagName) {
      const withTag = list.filter((r) => r.tags.some((t) => t.name === biasTagName));
      if (withTag.length > 0) list = withTag;
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => r.title.toLowerCase().includes(q));
    }
    return list;
  }, [recipes, biasActive, biasTagName, query]);

  function pick(recipeId: string) {
    startTransition(async () => {
      await setSlotRecipe(weekStartKey, dayIndex, slotKey, label, sortOrder, recipeId, scale);
      onClose();
    });
  }

  return (
    <div className="flex min-h-screen w-full flex-col justify-end bg-ink/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Choose ${label.toLowerCase()}`}
        className="w-full rounded-t-2xl bg-cream p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl text-canyon">{label}</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border-2 border-buttercream px-3 py-1"
          >
            Close
          </button>
        </div>

        {mode === "note" ? (
          <div className="mt-4">
            <NoteEditor
              weekStartKey={weekStartKey}
              dayIndex={dayIndex}
              slotKey={slotKey}
              label={label}
              sortOrder={sortOrder}
              initialNote={initialNote ?? ""}
              onClose={onClose}
            />
            <button
              type="button"
              onClick={() => setMode("recipe")}
              className="mt-3 text-sm underline"
            >
              Pick a recipe instead
            </button>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            <div>
              <label className="text-sm font-bold" htmlFor="recipe-search">
                Search recipes
              </label>
              <input
                id="recipe-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title"
                className="w-full rounded-lg border-2 border-buttercream p-2"
              />
            </div>

            {biasTagName && (
              <button
                type="button"
                onClick={() => setBiasActive((v) => !v)}
                aria-pressed={biasActive}
                className={`self-start rounded-full px-3 py-1 text-sm ${
                  biasActive ? "bg-olive text-white" : "border-2 border-buttercream"
                }`}
              >
                {biasActive ? `Showing: ${biasTagName}` : `Show: ${biasTagName}`}
              </button>
            )}

            <div>
              <p className="text-sm font-bold">Scale</p>
              <div className="mt-1 flex gap-2">
                {SCALES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setScale(s)}
                    aria-pressed={scale === s}
                    className={`rounded-full px-3 py-1 text-sm ${
                      scale === s ? "bg-canyon text-white" : "border-2 border-buttercream"
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
              {filtered.length === 0 && (
                <li className="text-sm text-ink/50">No recipes found.</li>
              )}
              {filtered.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => pick(r.id)}
                    aria-pressed={r.id === initialRecipeId}
                    className={`w-full rounded-lg px-3 py-2 text-left disabled:opacity-50 ${
                      r.id === initialRecipeId ? "bg-olive/20 ring-2 ring-olive" : "bg-card"
                    }`}
                  >
                    {r.title}
                  </button>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => setMode("note")}
              className="self-start text-sm underline"
            >
              Just a note instead
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
