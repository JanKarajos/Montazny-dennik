-- Servisný denník: zákazky sa rozlišujú podľa typu denníka (montážny / servisný).
CREATE TYPE "DiaryType" AS ENUM ('ASSEMBLY', 'SERVICE');

ALTER TABLE "Project"
  ADD COLUMN "type" "DiaryType" NOT NULL DEFAULT 'ASSEMBLY';

-- Číslo zákazky je unikátne len v rámci jedného typu denníka.
DROP INDEX IF EXISTS "Project_projectNumber_key";
CREATE UNIQUE INDEX "Project_type_projectNumber_key" ON "Project"("type", "projectNumber");
CREATE INDEX "Project_type_createdAt_idx" ON "Project"("type", "createdAt");
