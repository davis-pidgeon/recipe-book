"use client";
import { useRouter, useSearchParams } from "next/navigation";
import type { Tag } from "@prisma/client";
import { TAG_GROUP_LABELS } from "@/lib/recipes/tags";

export default function RecipeFilters({ tags }: { tags: Tag[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const selectedTags = new Set(params.getAll("tag"));

  function toggleTag(id: string) {
    const next = new URLSearchParams(params.toString());
    const current = next.getAll("tag");
    next.delete("tag");
    const updated = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    updated.forEach((x) => next.append("tag", x));
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
    </div>
  );
}
