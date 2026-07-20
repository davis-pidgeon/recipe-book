-- CreateTable
CREATE TABLE "PlanSlot" (
    "id" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "dayIndex" INTEGER NOT NULL,
    "slotKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "scale" INTEGER NOT NULL DEFAULT 1,
    "recipeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanSlot_weekStart_idx" ON "PlanSlot"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "PlanSlot_weekStart_dayIndex_slotKey_key" ON "PlanSlot"("weekStart", "dayIndex", "slotKey");

-- AddForeignKey
ALTER TABLE "PlanSlot" ADD CONSTRAINT "PlanSlot_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
