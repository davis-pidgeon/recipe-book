export default function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 p-12 text-center">
      <div aria-hidden className="flex h-32 w-32 items-center justify-center rounded-3xl bg-buttercream text-5xl">🍽️</div>
      <p className="text-xl">{title}</p>
      {hint && <p className="text-ink/70">{hint}</p>}
    </div>
  );
}
