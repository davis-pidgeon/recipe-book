/*
  Warnings:

  - Added the required column `updatedAt` to the `Recipe` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TagGroup" AS ENUM ('MEAL_OCCASION', 'DIETARY', 'CUISINE', 'MEAT', 'GROCERY_STORE', 'EQUIPMENT');

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "costRating" INTEGER,
ADD COLUMN     "courtneyFavorite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "davisFavorite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dislike" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "easyScaleable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fellowshipFav" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "freezerFriendly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "instructions" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "lowCalorie" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notes" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "runningRecovery" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tasteRating" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "veggieForward" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "quantity" DOUBLE PRECISION,
    "unit" TEXT,
    "name" TEXT NOT NULL,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "group" "TagGroup" NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_RecipeTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RecipeTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "Ingredient_recipeId_idx" ON "Ingredient"("recipeId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_group_name_key" ON "Tag"("group", "name");

-- CreateIndex
CREATE INDEX "_RecipeTags_B_index" ON "_RecipeTags"("B");

-- AddForeignKey
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RecipeTags" ADD CONSTRAINT "_RecipeTags_A_fkey" FOREIGN KEY ("A") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RecipeTags" ADD CONSTRAINT "_RecipeTags_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
