"use client";
import { RECIPE_FLAGS } from "@/lib/recipes/flags";

export default function FlagToggles({ initial }: { initial?: Record<string, boolean> }) {
  return (
    <div className="flex flex-wrap gap-2">
      {RECIPE_FLAGS.map((f) => (
        <label key={f.name} className="flex items-center gap-2 rounded-full border-2 border-buttercream px-3 py-1">
          <input type="checkbox" name={f.name} defaultChecked={initial?.[f.name] ?? false} />
          {f.label}
        </label>
      ))}
    </div>
  );
}
