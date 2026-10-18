-- Servisný denník: zákazky sa rozlišujú podľa typu denníka (montážny / servisný).
-- Migrácia je idempotentná, aby ju bolo možné bezpečne spustiť aj pri nasadení.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DiaryType') THEN
    CREATE TYPE "DiaryType" AS ENUM ('ASSEMBLY', 'SERVICE');
  END IF;
END
$$;

ALTER TABLE "Project"
  ADD COLUMN IF NOT EXISTS "type" "DiaryType" NOT NULL DEFAULT 'ASSEMBLY';

-- Číslo zákazky je unikátne len v rámci jedného typu denníka.
DROP INDEX IF EXISTS "Project_projectNumber_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Project_type_projectNumber_key" ON "Project"("type", "projectNumber");
CREATE INDEX IF NOT EXISTS "Project_type_createdAt_idx" ON "Project"("type", "createdAt");
