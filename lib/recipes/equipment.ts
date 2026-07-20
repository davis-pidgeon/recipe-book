export const EQUIPMENT_TERMS = [
  "oven", "skillet", "pan", "saucepan", "pot", "baking sheet", "sheet pan",
  "blender", "food processor", "stand mixer", "hand mixer", "whisk",
  "slow cooker", "instant pot", "pressure cooker", "air fryer", "grill",
  "dutch oven", "wok", "colander", "rolling pin", "microwave", "toaster",
];

export function detectEquipment(instructions: string): string[] {
  const text = instructions.toLowerCase();
  const found: string[] = [];
  for (const term of EQUIPMENT_TERMS) {
    const pattern = new RegExp(`\\b${term.replace(/ /g, "\\s+")}\\b`, "i");
    if (pattern.test(text)) found.push(term);
  }
  return found;
}
