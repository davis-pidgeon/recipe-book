import { notFound } from "next/navigation";
import { getRecipe, listTags } from "@/lib/recipes/queries";
import { updateRecipe, deleteRecipe } from "@/lib/recipes/actions";
import RecipeForm from "@/components/recipes/RecipeForm";
import { RECIPE_FLAGS } from "@/lib/recipes/flags";

const FLAG_NAMES = RECIPE_FLAGS.map((f) => f.name);

export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [recipe, tags] = await Promise.all([getRecipe(id), listTags()]);
  if (!recipe) notFound();

  const flags: Record<string, boolean> = {};
  for (const f of FLAG_NAMES) flags[f] = (recipe as Record<string, unknown>)[f] as boolean;

  const update = updateRecipe.bind(null, id);
  const remove = deleteRecipe.bind(null, id);

  return (
    <div className="p-2">
      <h1 className="px-6 pt-6 text-3xl text-canyon">Edit recipe</h1>
      <RecipeForm
        action={update}
        tags={tags}
        submitLabel="Save changes"
        initial={{
          title: recipe.title,
          servings: recipe.servings,
          instructions: recipe.instructions,
          notes: recipe.notes,
          ingredients: recipe.ingredients.map((i) => ({ quantity: i.quantity, unit: i.unit, name: i.name })),
          tagIds: recipe.tags.map((t) => t.id),
          flags,
          tasteRating: recipe.tasteRating,
          costRating: recipe.costRating,
        }}
      />
      <form action={remove} className="mx-auto max-w-2xl px-6 pb-10">
        <button type="submit" className="rounded-full border-2 border-canyon px-4 py-2 text-canyon">Delete recipe</button>
      </form>
    </div>
  );
}
