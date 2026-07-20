import type { Tag } from "@prisma/client";
import IngredientRows from "./IngredientRows";
import TagPicker from "./TagPicker";
import FlagToggles from "./FlagToggles";
import StarRating from "./StarRating";
import type { ParsedIngredient } from "@/lib/recipes/ingredients";

type Initial = {
  title?: string; servings?: number; instructions?: string; notes?: string;
  ingredients?: ParsedIngredient[]; tagIds?: string[];
  flags?: Record<string, boolean>; tasteRating?: number | null; costRating?: number | null;
};

export default function RecipeForm({
  action, tags, initial, submitLabel,
}: {
  action: (form: FormData) => void | Promise<void>;
  tags: Tag[];
  initial?: Initial;
  submitLabel: string;
}) {
  return (
    <form action={action} className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div>
        <label className="text-sm font-bold" htmlFor="title">Title</label>
        <input id="title" name="title" defaultValue={initial?.title} required className="w-full rounded-lg border-2 border-buttercream p-2" />
      </div>
      <div>
        <label className="text-sm font-bold" htmlFor="servings">Servings</label>
        <input id="servings" name="servings" type="number" min={1} defaultValue={initial?.servings ?? 1} className="w-24 rounded-lg border-2 border-buttercream p-2" />
      </div>
      <div>
        <p className="text-sm font-bold">Ingredients</p>
        <IngredientRows initial={initial?.ingredients} />
      </div>
      <div>
        <label className="text-sm font-bold" htmlFor="instructions">Instructions</label>
        <textarea id="instructions" name="instructions" defaultValue={initial?.instructions} rows={8} className="w-full rounded-lg border-2 border-buttercream p-2" />
      </div>
      <div>
        <label className="text-sm font-bold" htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" defaultValue={initial?.notes} rows={3} className="w-full rounded-lg border-2 border-buttercream p-2" />
      </div>
      <div>
        <p className="text-sm font-bold">Tags</p>
        <TagPicker tags={tags} initialIds={initial?.tagIds} />
      </div>
      <div>
        <p className="text-sm font-bold">Flags</p>
        <FlagToggles initial={initial?.flags} />
      </div>
      <div className="flex gap-6">
        <div><p className="text-sm font-bold">Taste</p><StarRating name="tasteRating" initial={initial?.tasteRating} /></div>
        <div><p className="text-sm font-bold">Cost</p><StarRating name="costRating" initial={initial?.costRating} /></div>
      </div>
      <button type="submit" className="rounded-full bg-canyon px-4 py-2 font-bold text-white">{submitLabel}</button>
    </form>
  );
}
