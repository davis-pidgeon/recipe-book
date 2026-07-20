"use client";

import { useState } from "react";
import Link from "next/link";
import { scaleQuantity, scaleServings, formatQuantity } from "@/lib/recipes/scale";

type Ing = { quantity: number | null; unit: string | null; name: string };

export default function ScaleControl({
  recipeId,
  servings,
  ingredients,
}: {
  recipeId: string;
  servings: number;
  ingredients: Ing[];
}) {
  const [mult, setMult] = useState(1);

  return (
    <div>
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMult(m)}
            className={`rounded-full px-3 py-1 font-bold ${
              mult === m ? "bg-canyon text-white" : "border-2 border-buttercream"
            }`}
          >
            {m}x
          </button>
        ))}
        {mult !== 1 && (
          <span className="rounded-full bg-olive px-3 py-1 text-sm font-bold text-white">{mult}x scaled</span>
        )}
        <span className="ml-auto text-sm text-ink/60">Serves {scaleServings(servings, mult)}</span>
        <Link href={`/recipes/${recipeId}/print?scale=${mult}`} className="rounded-full border-2 border-buttercream px-3 py-1">
          Print
        </Link>
      </div>
      <ul className="mt-3 flex flex-col gap-1">
        {ingredients.map((ing, i) => (
          <li key={i}>
            {[formatQuantity(scaleQuantity(ing.quantity, mult)), ing.unit, ing.name].filter(Boolean).join(" ")}
          </li>
        ))}
      </ul>
    </div>
  );
}
