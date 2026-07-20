"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/db";
import { detectEquipment } from "./equipment";
import { TagGroup } from "@prisma/client";
import { parseRecipeForm, type RecipeInput } from "./parseRecipeForm";
// Note: RecipeInput is intentionally NOT re-exported from this file. Next's
// "use server" file transform treats every export (even `export type`,
// which normal tsc erases) as a server-action reference and tries to bundle
// a runtime binding for it, which fails at request time since no such
// binding exists for a type. Consumers needing the type should import it
// directly from "./parseRecipeForm".

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

// Upserts a tag within a group (e.g. a new cuisine) so the tag picker can be
// extended inline without a separate admin screen. Reuses the same
// group+name upsert pattern as equipmentTagIds above.
export async function createTag(group: TagGroup, name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Tag name is required");

  const tag = await prisma.tag.upsert({
    where: { group_name: { group, name: trimmed } },
    update: {},
    create: { group, name: trimmed },
  });

  revalidatePath("/recipes/new");
  return tag;
}
