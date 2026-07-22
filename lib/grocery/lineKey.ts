export function lineKey(planSlotId: string, recipeId: string, position: number): string {
  return `${planSlotId}:${recipeId}:${position}`;
}
