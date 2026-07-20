import Link from "next/link";
import type { Recipe, Tag } from "@prisma/client";

export default function RecipeCard({ recipe }: { recipe: Recipe & { tags: Tag[] } }) {
  return (
    <Link href={`/recipes/${recipe.id}`} className="block rounded-2xl border-l-8 border-canyon bg-card p-4">
      <p className="font-bold">{recipe.title}</p>
      <p className="text-sm text-ink/60">{recipe.tags.map((t) => t.name).join(" · ")}</p>
    </Link>
  );
}
