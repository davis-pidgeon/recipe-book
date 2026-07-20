export type ParsedIngredient = {
  quantity: number | null;
  unit: string | null;
  name: string;
};

const UNITS = new Set([
  "cup", "cups", "tbsp", "tablespoon", "tablespoons", "tsp", "teaspoon", "teaspoons",
  "oz", "ounce", "ounces", "lb", "lbs", "pound", "pounds", "g", "gram", "grams",
  "kg", "ml", "l", "liter", "liters", "clove", "cloves", "can", "cans", "pinch",
  "package", "packages", "slice", "slices", "stick", "sticks", "quart", "quarts",
  "pint", "pints", "gallon", "gallons", "dash", "handful",
]);

function parseNumber(tokens: string[]): { value: number | null; rest: string[] } {
  const first = tokens[0];
  if (first === undefined) return { value: null, rest: tokens };

  // Mixed number: "1 1/2"
  if (/^\d+$/.test(first) && tokens[1] && /^\d+\/\d+$/.test(tokens[1])) {
    const [n, d] = tokens[1].split("/").map(Number);
    if (d === 0) return { value: null, rest: tokens };
    return { value: Number(first) + n / d, rest: tokens.slice(2) };
  }
  // Simple fraction: "1/2"
  if (/^\d+\/\d+$/.test(first)) {
    const [n, d] = first.split("/").map(Number);
    if (d === 0) return { value: null, rest: tokens };
    return { value: n / d, rest: tokens.slice(1) };
  }
  // Integer or decimal
  if (/^\d+(\.\d+)?$/.test(first)) {
    return { value: Number(first), rest: tokens.slice(1) };
  }
  return { value: null, rest: tokens };
}

export function parseIngredientLine(line: string): ParsedIngredient {
  const trimmed = line.trim();
  const tokens = trimmed.split(/\s+/);
  const { value, rest } = parseNumber(tokens);

  if (value === null) {
    return { quantity: null, unit: null, name: trimmed };
  }

  let unit: string | null = null;
  let nameTokens = rest;
  if (rest[0] && UNITS.has(rest[0].toLowerCase().replace(/\.$/, ""))) {
    unit = rest[0].replace(/\.$/, "");
    nameTokens = rest.slice(1);
  }

  return { quantity: value, unit, name: nameTokens.join(" ") };
}

export function splitIngredients(text: string): ParsedIngredient[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map(parseIngredientLine);
}
