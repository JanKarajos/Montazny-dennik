-- Číslo servisnej zákazky sa môže opakovať; číslo montážnej zákazky zostáva unikátne.
-- Migrácia je idempotentná, aby ju bolo možné bezpečne spustiť aj viackrát.
DROP INDEX IF EXISTS "Project_type_projectNumber_key";
CREATE INDEX IF NOT EXISTS "Project_type_projectNumber_idx" ON "Project"("type", "projectNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "Project_assembly_projectNumber_key"
  ON "Project"("projectNumber")
  WHERE "type" = 'ASSEMBLY';
