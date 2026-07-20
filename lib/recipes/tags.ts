import { TagGroup } from "@prisma/client";

export const TAG_GROUP_LABELS: Record<TagGroup, string> = {
  MEAL_OCCASION: "Meal occasion",
  DIETARY: "Dietary",
  CUISINE: "Cuisine",
  MEAT: "Meat",
  GROCERY_STORE: "Grocery store",
  EQUIPMENT: "Equipment",
};

export const DEFAULT_TAGS: { group: TagGroup; names: string[] }[] = [
  {
    group: TagGroup.MEAL_OCCASION,
    names: [
      "Work breakfast", "Work lunch", "Work dinner",
      "Weekend breakfast", "Weekend lunch", "Weekend dinner",
    ],
  },
  { group: TagGroup.DIETARY, names: ["Gluten free", "Dairy free"] },
  {
    group: TagGroup.CUISINE,
    names: [
      "Italian", "Mexican", "Chinese", "Japanese", "Thai", "Indian",
      "Southern", "Mediterranean", "French", "Middle Eastern",
      "Korean", "Vietnamese", "Greek",
    ],
  },
  { group: TagGroup.MEAT, names: ["Chicken", "Beef", "Pork", "Turkey", "Seafood", "Vegetarian"] },
  { group: TagGroup.GROCERY_STORE, names: ["Kroger", "Trader Joe's", "Specialty"] },
];
