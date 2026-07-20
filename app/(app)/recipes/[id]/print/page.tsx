import { notFound } from "next/navigation";
import { getRecipe } from "@/lib/recipes/queries";
import { formatQuantity } from "@/lib/recipes/scale";
import "./print.css";

export default async function PrintRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();

  return (
    <div className="print-card mx-auto max-w-[5in] p-4">
      <h1 className="text-xl text-canyon">{recipe.title}</h1>
      <p className="text-sm">Serves {recipe.servings}</p>
      <h2 className="mt-2 font-bold">Ingredients</h2>
      <ul>
        {recipe.ingredients.map((i) => (
          <li key={i.id}>
            {[formatQuantity(i.quantity), i.unit, i.name].filter(Boolean).join(" ")}
          </li>
        ))}
      </ul>
      <h2 className="mt-2 font-bold">Instructions</h2>
      <p className="whitespace-pre-wrap">{recipe.instructions}</p>
      {recipe.notes && (
        <>
          <h2 className="mt-2 font-bold">Notes</h2>
          <p className="whitespace-pre-wrap">{recipe.notes}</p>
        </>
      )}
    </div>
  );
}
