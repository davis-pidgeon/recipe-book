export const PANTRY_STAPLES = [
  "salt", "black pepper", "olive oil", "vegetable oil", "canola oil",
  "cooking spray", "sugar", "brown sugar", "flour", "baking soda", "baking powder",
  "garlic powder", "onion powder", "paprika", "cumin", "oregano", "basil", "thyme",
  "cinnamon", "chili powder", "red pepper flakes", "cayenne", "nutmeg", "bay leaf",
  "vanilla extract", "soy sauce", "vinegar", "honey", "ketchup", "mustard",
  "mayonnaise", "water", "butter",
];

export function isPantryStaple(name: string): boolean {
  const n = name.toLowerCase();
  return PANTRY_STAPLES.some((term) => {
    const pattern = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+")}\\b`, "i");
    return pattern.test(n);
  });
}
