export const EQUIPMENT_TERMS = [
  "oven", "skillet", "pan", "saucepan", "pot", "baking sheet", "sheet pan",
  "blender", "food processor", "stand mixer", "hand mixer", "whisk",
  "slow cooker", "instant pot", "pressure cooker", "air fryer", "grill",
  "dutch oven", "wok", "colander", "rolling pin", "microwave", "toaster",
];

// Helper to escape regex metacharacters
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function detectEquipment(instructions: string): string[] {
  const text = instructions.toLowerCase();
  const found: string[] = [];

  for (const term of EQUIPMENT_TERMS) {
    const escapedTerm = escapeRegex(term);
    const pattern = new RegExp(`\\b${escapedTerm.replace(/ /g, "\\s+")}\\b`, "i");
    if (pattern.test(text)) found.push(term);
  }

  // Remove component terms subsumed by compound terms
  const result: string[] = [];
  for (const term of found) {
    let isSubsumed = false;
    for (const other of found) {
      if (term !== other) {
        // Check if term appears as a whole word within other
        const escapedTerm = escapeRegex(term);
        const subsumesRegex = new RegExp(`\\b${escapedTerm}\\b`);
        if (subsumesRegex.test(other)) {
          isSubsumed = true;
          break;
        }
      }
    }
    if (!isSubsumed) {
      result.push(term);
    }
  }

  return result;
}
