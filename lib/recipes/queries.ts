import prisma from "@/lib/db";
import { buildRecipeWhere, type RecipeFilters } from "./filters";

export function listRecipes(filters: RecipeFilters = {}) {
  return prisma.recipe.findMany({
    where: buildRecipeWhere(filters),
    include: { tags: true },
    orderBy: { title: "asc" },
  });
}

export function getRecipe(id: string) {
  return prisma.recipe.findUnique({
    where: { id },
    include: { ingredients: { orderBy: { position: "asc" } }, tags: true },
  });
}

export function listTags() {
  return prisma.tag.findMany({ orderBy: [{ group: "asc" }, { name: "asc" }] });
}
