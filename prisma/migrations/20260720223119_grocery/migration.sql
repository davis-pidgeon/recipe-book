-- CreateTable
CREATE TABLE "GroceryItem" (
    "id" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroceryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroceryLineFlag" (
    "id" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "lineKey" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "pantry" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "GroceryLineFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroceryItem_weekStart_idx" ON "GroceryItem"("weekStart");

-- CreateIndex
CREATE INDEX "GroceryLineFlag_weekStart_idx" ON "GroceryLineFlag"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "GroceryLineFlag_weekStart_lineKey_key" ON "GroceryLineFlag"("weekStart", "lineKey");
