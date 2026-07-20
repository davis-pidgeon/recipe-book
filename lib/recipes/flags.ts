export const RECIPE_FLAGS = [
  { name: "easyScaleable", label: "Easy scaleable" },
  { name: "veggieForward", label: "Veggie-forward" },
  { name: "runningRecovery", label: "Running recovery" },
  { name: "lowCalorie", label: "Low calorie" },
  { name: "davisFavorite", label: "Davis favorite" },
  { name: "courtneyFavorite", label: "Courtney favorite" },
  { name: "fellowshipFav", label: "Fellowship favorite" },
  { name: "freezerFriendly", label: "Freezer friendly" },
  { name: "dislike", label: "Dislike" },
] as const;

export const RECIPE_FLAG_KEYS: readonly string[] = RECIPE_FLAGS.map(
  (f) => f.name
);
