"use client";
import Image from "next/image";
import { useState } from "react";

// Renders the uploaded welcome illustration if present; otherwise a simple
// placeholder. Drop an image at public/illustrations/welcome-hero.png and it
// appears automatically — no code change needed.
export default function HeroIllustration() {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        aria-hidden
        className="mx-auto mb-6 flex h-40 w-40 items-center justify-center rounded-3xl bg-buttercream text-4xl"
      >
        🍊
      </div>
    );
  }

  return (
    <Image
      src="/illustrations/welcome-hero.png"
      alt=""
      width={240}
      height={240}
      priority
      onError={() => setFailed(true)}
      className="mx-auto mb-6 h-40 w-40 object-contain"
    />
  );
}
