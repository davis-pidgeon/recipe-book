export function pickRandom<T>(pool: T[], count: number, rng: () => number = Math.random): T[] {
  const items = [...pool];
  // Fisher–Yates using rng
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items.slice(0, Math.max(0, count));
}
