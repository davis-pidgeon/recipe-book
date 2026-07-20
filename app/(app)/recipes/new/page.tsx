import { createRecipe } from "@/lib/recipes/actions";
import { listTags } from "@/lib/recipes/queries";
import RecipeForm from "@/components/recipes/RecipeForm";

export default async function NewRecipePage() {
  const tags = await listTags();
  return (
    <div className="p-2">
      <h1 className="px-6 pt-6 text-3xl text-canyon">Add a recipe</h1>
      <RecipeForm action={createRecipe} tags={tags} submitLabel="Save recipe" />
    </div>
  );
}
