import { notFound } from "next/navigation";
import { getRecipe } from "@/lib/recipes/queries";
import { scaleQuantity, scaleServings, formatQuantity } from "@/lib/recipes/scale";
import "./print.css";

export default async function PrintRecipePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();

  const sp = await searchParams;
  const raw = Number(Array.isArray(sp.scale) ? sp.scale[0] : sp.scale);
  const scale = [1, 2, 3].includes(raw) ? raw : 1;

  return (
    <div className="print-card mx-auto max-w-[5in] p-4">
      <h1 className="text-xl text-canyon">{recipe.title}</h1>
      {scale !== 1 && <p className="text-sm">{scale}x scaled</p>}
      <p className="text-sm">Serves {scaleServings(recipe.servings, scale)}</p>
      <h2 className="mt-2 font-bold">Ingredients</h2>
      <ul>
        {recipe.ingredients.map((i) => (
          <li key={i.id}>
            {[formatQuantity(scaleQuantity(i.quantity, scale)), i.unit, i.name].filter(Boolean).join(" ")}
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
