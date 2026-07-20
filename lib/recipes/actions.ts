"use server";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import type { ParsedIngredient } from "./ingredients";
import { detectEquipment } from "./equipment";
import { RECIPE_FLAGS } from "./flags";
import { TagGroup } from "@prisma/client";

const FLAG_NAMES = RECIPE_FLAGS.map((f) => f.name);

export type RecipeInput = {
  title: string;
  servings: number;
  instructions: string;
  notes: string;
  ingredients: ParsedIngredient[];
  tagIds: string[];
  flags: Record<string, boolean>;
  tasteRating: number | null;
  costRating: number | null;
};

export function parseRecipeForm(form: FormData): RecipeInput {
  const num = (v: FormDataEntryValue | null) =>
    v === null || v === "" ? null : Number(v);

  const flags: Record<string, boolean> = {};
  for (const name of FLAG_NAMES) flags[name] = form.get(name) === "on";

  return {
    title: String(form.get("title") ?? "").trim(),
    servings: Number(form.get("servings") ?? 1) || 1,
    instructions: String(form.get("instructions") ?? ""),
    notes: String(form.get("notes") ?? ""),
    ingredients: JSON.parse(String(form.get("ingredients") ?? "[]")) as ParsedIngredient[],
    tagIds: form.getAll("tagId").map(String),
    flags,
    tasteRating: num(form.get("tasteRating")),
    costRating: num(form.get("costRating")),
  };
}

async function equipmentTagIds(instructions: string): Promise<string[]> {
  const terms = detectEquipment(instructions);
  const ids: string[] = [];
  for (const name of terms) {
    const tag = await prisma.tag.upsert({
      where: { group_name: { group: TagGroup.EQUIPMENT, name } },
      update: {},
      create: { group: TagGroup.EQUIPMENT, name },
    });
    ids.push(tag.id);
  }
  return ids;
}

function recipeData(input: RecipeInput) {
  return {
    title: input.title,
    servings: input.servings,
    instructions: input.instructions,
    notes: input.notes,
    tasteRating: input.tasteRating,
    costRating: input.costRating,
    ...input.flags,
  };
}

export async function createRecipe(form: FormData): Promise<void> {
  const input = parseRecipeForm(form);
  const equipmentIds = await equipmentTagIds(input.instructions);
  const tagIds = [...new Set([...input.tagIds, ...equipmentIds])];

  const recipe = await prisma.recipe.create({
    data: {
      ...recipeData(input),
      ingredients: {
        create: input.ingredients.map((ing, i) => ({
          position: i,
          quantity: ing.quantity,
          unit: ing.unit,
          name: ing.name,
        })),
      },
      tags: { connect: tagIds.map((id) => ({ id })) },
    },
  });

  redirect(`/recipes/${recipe.id}`);
}

export async function updateRecipe(id: string, form: FormData): Promise<void> {
  const input = parseRecipeForm(form);
  const equipmentIds = await equipmentTagIds(input.instructions);
  const tagIds = [...new Set([...input.tagIds, ...equipmentIds])];

  await prisma.$transaction([
    prisma.ingredient.deleteMany({ where: { recipeId: id } }),
    prisma.recipe.update({
      where: { id },
      data: {
        ...recipeData(input),
        ingredients: {
          create: input.ingredients.map((ing, i) => ({
            position: i,
            quantity: ing.quantity,
            unit: ing.unit,
            name: ing.name,
          })),
        },
        tags: { set: tagIds.map((id) => ({ id })) },
      },
    }),
  ]);

  redirect(`/recipes/${id}`);
}

export async function deleteRecipe(id: string): Promise<void> {
  await prisma.recipe.delete({ where: { id } });
  redirect("/recipes");
}
