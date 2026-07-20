"use client";

import Image from "next/image";
import { useState } from "react";

// Renders the recipes empty-state illustration if present at
// public/illustrations/recipes-empty.png; otherwise falls back to a simple
// emoji placeholder. Drop the image in place and it appears automatically —
// no code change needed. Same pattern as HeroIllustration.
export default function EmptyState({ title, hint }: { title: string; hint?: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="flex flex-col items-center gap-3 p-12 text-center">
      {failed ? (
        <div
          aria-hidden
          className="flex h-32 w-32 items-center justify-center rounded-3xl bg-buttercream text-5xl"
        >
          🍽️
        </div>
      ) : (
        <Image
          src="/illustrations/recipes-empty.png"
          alt=""
          width={160}
          height={160}
          onError={() => setFailed(true)}
          className="h-32 w-32 object-contain"
        />
      )}
      <p className="text-xl">{title}</p>
      {hint && <p className="text-ink/70">{hint}</p>}
    </div>
  );
}
