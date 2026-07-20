export function scaleQuantity(quantity: number | null, multiplier: number): number | null {
  if (quantity === null) return null;
  return Math.round(quantity * multiplier * 100) / 100;
}

export function scaleServings(servings: number, multiplier: number): number {
  return servings * multiplier;
}

export function formatQuantity(quantity: number | null): string {
  if (quantity === null) return "";
  return Number(quantity.toFixed(2)).toString();
}
