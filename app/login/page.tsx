"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) router.push("/recipes");
    else setError(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm">
        <h1 className="text-3xl text-canyon">Recipe book</h1>
        <input
          type="password"
          aria-label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-4 w-full rounded-full border-2 border-buttercream bg-card px-4 py-2"
          placeholder="Enter password"
        />
        <button
          type="submit"
          className="mt-3 w-full rounded-full bg-canyon px-4 py-2 text-white"
        >
          Enter
        </button>
        {error && (
          <p className="mt-2 text-sm text-canyon">
            That password didn’t work. Try again.
          </p>
        )}
      </form>
    </main>
  );
}
