"use client";
import { useState } from "react";

export default function StarRating({ name, initial }: { name: string; initial?: number | null }) {
  const [value, setValue] = useState<number | null>(initial ?? null);
  return (
    <div className="flex items-center gap-1">
      <input type="hidden" name={name} value={value ?? ""} />
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${name} ${n} stars`}
          onClick={() => setValue(n === value ? null : n)}
          className={n <= (value ?? 0) ? "text-canyon" : "text-ink/30"}
        >
          ★
        </button>
      ))}
    </div>
  );
}
