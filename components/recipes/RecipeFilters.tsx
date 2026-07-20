"use client";
import { useRouter, useSearchParams } from "next/navigation";
import type { Tag } from "@prisma/client";
import { TAG_GROUP_LABELS } from "@/lib/recipes/tags";
import { RECIPE_FLAGS } from "@/lib/recipes/flags";

const RATING_VALUES = [1, 2, 3, 4, 5];

export default function RecipeFilters({ tags }: { tags: Tag[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const selectedTags = new Set(params.getAll("tag"));
  const selectedFlags = new Set(params.getAll("flag"));
  const minTaste = params.get("minTaste");
  const minCost = params.get("minCost");

  function toggleTag(id: string) {
    const next = new URLSearchParams(params.toString());
    const current = next.getAll("tag");
    next.delete("tag");
    const updated = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    updated.forEach((x) => next.append("tag", x));
    router.push(`/recipes?${next.toString()}`);
  }
  function toggleFlag(name: string) {
    const next = new URLSearchParams(params.toString());
    const current = next.getAll("flag");
    next.delete("flag");
    const updated = current.includes(name) ? current.filter((x) => x !== name) : [...current, name];
    updated.forEach((x) => next.append("flag", x));
    router.push(`/recipes?${next.toString()}`);
  }
  function setMinRating(paramName: "minTaste" | "minCost", value: number) {
    const next = new URLSearchParams(params.toString());
    const current = next.get(paramName);
    if (value === 0 || current === String(value)) {
      next.delete(paramName);
    } else {
      next.set(paramName, String(value));
    }
    router.push(`/recipes?${next.toString()}`);
  }
  function setQuery(q: string) {
    const next = new URLSearchParams(params.toString());
    if (q) {
      next.set("q", q);
    } else {
      next.delete("q");
    }
    router.push(`/recipes?${next.toString()}`);
  }

  const groups = Array.from(new Set(tags.map((t) => t.group)));
  return (
    <div className="flex flex-col gap-3">
      <input
        aria-label="Search recipes"
        defaultValue={params.get("q") ?? ""}
        onKeyDown={(e) => { if (e.key === "Enter") setQuery((e.target as HTMLInputElement).value); }}
        placeholder="Search recipes"
        className="w-full rounded-full border-2 border-buttercream px-4 py-2"
      />
      {groups.map((g) => (
        <div key={g}>
          <p className="text-xs font-bold uppercase text-ink/60">{TAG_GROUP_LABELS[g]}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {tags.filter((t) => t.group === g).map((t) => (
              <button key={t.id} type="button" onClick={() => toggleTag(t.id)}
                className={`rounded-full px-3 py-1 text-sm ${selectedTags.has(t.id) ? "bg-canyon text-white" : "border-2 border-buttercream"}`}>
                {t.name}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div>
        <p className="text-xs font-bold uppercase text-ink/60">Flags</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {RECIPE_FLAGS.map((f) => (
            <button key={f.name} type="button" onClick={() => toggleFlag(f.name)}
              className={`rounded-full px-3 py-1 text-sm ${selectedFlags.has(f.name) ? "bg-canyon text-white" : "border-2 border-buttercream"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-bold uppercase text-ink/60">Min taste</p>
        <div className="mt-1 flex flex-wrap gap-2">
          <button type="button" onClick={() => setMinRating("minTaste", 0)} aria-label="Min taste any"
            className={`rounded-full px-3 py-1 text-sm ${!minTaste ? "bg-canyon text-white" : "border-2 border-buttercream"}`}
            disabled={!minTaste}>
            Any
          </button>
          {RATING_VALUES.map((n) => (
            <button key={n} type="button" onClick={() => setMinRating("minTaste", n)} aria-label={`Min taste ${n}`}
              className={`rounded-full px-3 py-1 text-sm ${minTaste === String(n) ? "bg-canyon text-white" : "border-2 border-buttercream"}`}>
              {n}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-bold uppercase text-ink/60">Min cost</p>
        <div className="mt-1 flex flex-wrap gap-2">
          <button type="button" onClick={() => setMinRating("minCost", 0)} aria-label="Min cost any"
            className={`rounded-full px-3 py-1 text-sm ${!minCost ? "bg-canyon text-white" : "border-2 border-buttercream"}`}
            disabled={!minCost}>
            Any
          </button>
          {RATING_VALUES.map((n) => (
            <button key={n} type="button" onClick={() => setMinRating("minCost", n)} aria-label={`Min cost ${n}`}
              className={`rounded-full px-3 py-1 text-sm ${minCost === String(n) ? "bg-canyon text-white" : "border-2 border-buttercream"}`}>
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
