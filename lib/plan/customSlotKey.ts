// Pure, DB-free helper, deliberately kept out of actions.ts.
//
// actions.ts has a file-level "use server" directive, and Next 16 treats every
// export from such a file as a Server Function reference (see
// node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-server.md).
// customSlotKey is a synchronous, DB-free helper — exporting it directly from
// actions.ts trips a build error ("Server Actions must be async functions")
// as soon as a real Server/Client Component imports the module (this bit
// Phase 2; see lib/recipes/parseRecipeForm.ts for the established pattern).
export function customSlotKey(): string {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
