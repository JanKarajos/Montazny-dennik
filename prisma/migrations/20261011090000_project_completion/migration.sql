-- Ukončenie zákazky: digitálny podpis, nahratý papierový protokol alebo bez podpisu.
-- Migrácia je idempotentná, aby ju bolo možné bezpečne spustiť aj viackrát.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CompletionMethod') THEN
    CREATE TYPE "CompletionMethod" AS ENUM ('DIGITAL_SIGNATURE', 'PAPER_PROTOCOL', 'WITHOUT_SIGNATURE');
  END IF;
END
$$;

ALTER TABLE "Project"
  ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "completedById" UUID,
  ADD COLUMN IF NOT EXISTS "completionMethod" "CompletionMethod";

CREATE TABLE IF NOT EXISTS "SignedProtocol" (
  "id" UUID NOT NULL,
  "projectId" UUID NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "data" BYTEA NOT NULL,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "uploadedById" UUID,
  CONSTRAINT "SignedProtocol_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SignedProtocol_projectId_key" ON "SignedProtocol"("projectId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Project_completedById_fkey') THEN
    ALTER TABLE "Project" ADD CONSTRAINT "Project_completedById_fkey"
      FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SignedProtocol_projectId_fkey') THEN
    ALTER TABLE "SignedProtocol" ADD CONSTRAINT "SignedProtocol_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SignedProtocol_uploadedById_fkey') THEN
    ALTER TABLE "SignedProtocol" ADD CONSTRAINT "SignedProtocol_uploadedById_fkey"
      FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- Nová tabuľka nesmie byť dostupná cez verejné Supabase API.
ALTER TABLE "SignedProtocol" ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE
  api_role TEXT;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON TABLE "SignedProtocol" FROM %I', api_role);
    END IF;
  END LOOP;
END
$$;

-- Zákazky podpísané oboma stranami pred touto zmenou sa označia ako ukončené.
UPDATE "Project"
SET "completedAt" = GREATEST("employeeSignedAt", "customerSignedAt"),
    "completionMethod" = 'DIGITAL_SIGNATURE'
WHERE "completedAt" IS NULL
  AND "employeeSignedAt" IS NOT NULL
  AND "customerSignedAt" IS NOT NULL;
