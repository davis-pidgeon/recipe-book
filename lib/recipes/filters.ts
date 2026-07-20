import type { Prisma } from "@prisma/client";
import { RECIPE_FLAG_KEYS } from "./flags";

export type RecipeFilters = {
  query?: string;
  tagIds?: string[];
  flags?: string[];
  minTaste?: number;
  minCost?: number;
};

export function buildRecipeWhere(filters: RecipeFilters): Prisma.RecipeWhereInput {
  const where: Prisma.RecipeWhereInput = {};

  if (filters.query && filters.query.trim()) {
    const q = filters.query.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { ingredients: { some: { name: { contains: q, mode: "insensitive" } } } },
    ];
  }

  if (filters.tagIds && filters.tagIds.length > 0) {
    where.AND = filters.tagIds.map((id) => ({ tags: { some: { id } } }));
  }

  if (filters.flags) {
    for (const flag of filters.flags) {
      if (RECIPE_FLAG_KEYS.includes(flag)) {
        (where as Record<string, unknown>)[flag] = true;
      }
    }
  }

  if (typeof filters.minTaste === "number") where.tasteRating = { gte: filters.minTaste };
  if (typeof filters.minCost === "number") where.costRating = { gte: filters.minCost };

  return where;
}
