import Link from "next/link";
import { Suspense } from "react";
import { listRecipes, listTags } from "@/lib/recipes/queries";
import type { RecipeFilters as Filters } from "@/lib/recipes/filters";
import RecipeCard from "@/components/recipes/RecipeCard";
import RecipeFilters from "@/components/recipes/RecipeFilters";
import EmptyState from "@/components/ui/EmptyState";

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const asArray = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
  const filters: Filters = {
    query: typeof sp.q === "string" ? sp.q : undefined,
    tagIds: asArray(sp.tag),
    flags: asArray(sp.flag),
    minTaste: sp.minTaste ? Number(sp.minTaste) : undefined,
    minCost: sp.minCost ? Number(sp.minCost) : undefined,
  };
  const [recipes, tags] = await Promise.all([listRecipes(filters), listTags()]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl text-canyon">My recipes</h1>
        <Link href="/recipes/new" className="rounded-full bg-canyon px-4 py-2 font-bold text-white">Add recipe</Link>
      </div>
      <div className="mt-4 grid gap-6 md:grid-cols-[220px_1fr]">
        <Suspense fallback={<div className="h-10 w-full rounded-full border-2 border-buttercream" />}>
          <RecipeFilters tags={tags} />
        </Suspense>
        {recipes.length === 0 ? (
          <EmptyState title="No recipes yet" hint="Add your first recipe to get started." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {recipes.map((r) => <RecipeCard key={r.id} recipe={r} />)}
          </div>
        )}
      </div>
    </div>
  );
}
