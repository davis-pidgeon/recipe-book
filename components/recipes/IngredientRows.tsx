"use client";
import { useState } from "react";
import { splitIngredients, type ParsedIngredient } from "@/lib/recipes/ingredients";

export default function IngredientRows({ initial }: { initial?: ParsedIngredient[] }) {
  const [rows, setRows] = useState<ParsedIngredient[]>(initial ?? []);
  const [paste, setPaste] = useState("");

  function doSplit() {
    setRows([...rows, ...splitIngredients(paste)]);
    setPaste("");
  }
  function update(i: number, patch: Partial<ParsedIngredient>) {
    setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function remove(i: number) {
    setRows(rows.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <input type="hidden" name="ingredients" value={JSON.stringify(rows)} />
      <textarea
        aria-label="Paste ingredients"
        value={paste}
        onChange={(e) => setPaste(e.target.value)}
        className="w-full rounded-lg border-2 border-buttercream p-2"
        placeholder={"2 cups flour\n3 eggs"}
        rows={4}
      />
      <button type="button" onClick={doSplit} className="mt-2 rounded-full bg-sky px-3 py-1">
        Split into rows
      </button>
      <ul className="mt-3 flex flex-col gap-2">
        {rows.map((r, i) => (
          <li key={i} className="flex gap-2">
            <input aria-label="quantity" value={r.quantity ?? ""} onChange={(e) => update(i, { quantity: e.target.value === "" ? null : Number(e.target.value) })} className="w-16 rounded border p-1" />
            <input aria-label="unit" value={r.unit ?? ""} onChange={(e) => update(i, { unit: e.target.value || null })} className="w-24 rounded border p-1" />
            <input aria-label="name" value={r.name} onChange={(e) => update(i, { name: e.target.value })} className="flex-1 rounded border p-1" />
            <button type="button" onClick={() => remove(i)} aria-label="remove">✕</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
