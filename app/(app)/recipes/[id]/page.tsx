import { notFound } from "next/navigation";
import Link from "next/link";
import { getRecipe } from "@/lib/recipes/queries";
import ScaleControl from "@/components/recipes/ScaleControl";

export default async function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl text-canyon">{recipe.title}</h1>
        <div className="flex gap-2">
          <Link href={`/recipes/${recipe.id}/edit`} className="rounded-full border-2 border-buttercream px-3 py-1">
            Edit
          </Link>
        </div>
      </div>

      {recipe.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {recipe.tags.map((tag) => (
            <span key={tag.id} className="rounded-full bg-sky/20 px-3 py-1 text-sm text-ink/80">
              {tag.name}
            </span>
          ))}
        </div>
      )}

      <section className="mt-4">
        <h2 className="text-xl">Ingredients</h2>
        <ScaleControl recipeId={recipe.id} servings={recipe.servings} ingredients={recipe.ingredients} />
      </section>

      <section className="mt-6">
        <h2 className="text-xl">Instructions</h2>
        <p className="mt-2 whitespace-pre-wrap leading-8">{recipe.instructions}</p>
      </section>

      {recipe.notes && (
        <section className="mt-6">
          <h2 className="text-xl">Notes</h2>
          <p className="mt-2 whitespace-pre-wrap">{recipe.notes}</p>
        </section>
      )}
    </div>
  );
}
