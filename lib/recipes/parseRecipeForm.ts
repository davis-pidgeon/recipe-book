// Pure form-parsing helper, deliberately kept out of actions.ts.
//
// actions.ts has a file-level "use server" directive, and Next 16 requires
// every export from such a file to be an async Server Function (see
// node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-server.md).
// parseRecipeForm is a synchronous, DB-free helper — bundling it inside
// actions.ts trips a Turbopack compile error ("Server Actions must be async
// functions") as soon as a real Server Component imports the module. Keeping
// it in its own file lets actions.ts import/re-export the type without
// exposing a sync function from the server-actions module.
import type { ParsedIngredient } from "./ingredients";
import { RECIPE_FLAGS } from "./flags";

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

function parseIngredients(raw: FormDataEntryValue | null): ParsedIngredient[] {
  try {
    const v = JSON.parse(String(raw ?? "[]"));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

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
    ingredients: parseIngredients(form.get("ingredients")),
    tagIds: form.getAll("tagId").map(String),
    flags,
    tasteRating: num(form.get("tasteRating")),
    costRating: num(form.get("costRating")),
  };
}
