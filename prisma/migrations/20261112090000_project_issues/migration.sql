-- Problémy na zákazke: popis chyby, postup riešenia a fotky.
-- Migrácia je idempotentná, aby ju bolo možné bezpečne spustiť aj viackrát.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IssueStatus') THEN
    CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'RESOLVED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IssuePhotoKind') THEN
    CREATE TYPE "IssuePhotoKind" AS ENUM ('PROBLEM', 'RESOLUTION');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "ProjectIssue" (
  "id" UUID NOT NULL,
  "projectId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "resolution" TEXT,
  "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
  "createdById" UUID,
  "resolvedById" UUID,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectIssue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "IssuePhoto" (
  "id" UUID NOT NULL,
  "issueId" UUID NOT NULL,
  "kind" "IssuePhotoKind" NOT NULL DEFAULT 'PROBLEM',
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "data" BYTEA NOT NULL,
  "thumbnail" BYTEA,
  "uploadedById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IssuePhoto_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProjectIssue_projectId_createdAt_idx" ON "ProjectIssue"("projectId", "createdAt");
CREATE INDEX IF NOT EXISTS "IssuePhoto_issueId_createdAt_idx" ON "IssuePhoto"("issueId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProjectIssue_projectId_fkey') THEN
    ALTER TABLE "ProjectIssue" ADD CONSTRAINT "ProjectIssue_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProjectIssue_createdById_fkey') THEN
    ALTER TABLE "ProjectIssue" ADD CONSTRAINT "ProjectIssue_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProjectIssue_resolvedById_fkey') THEN
    ALTER TABLE "ProjectIssue" ADD CONSTRAINT "ProjectIssue_resolvedById_fkey"
      FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'IssuePhoto_issueId_fkey') THEN
    ALTER TABLE "IssuePhoto" ADD CONSTRAINT "IssuePhoto_issueId_fkey"
      FOREIGN KEY ("issueId") REFERENCES "ProjectIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'IssuePhoto_uploadedById_fkey') THEN
    ALTER TABLE "IssuePhoto" ADD CONSTRAINT "IssuePhoto_uploadedById_fkey"
      FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- Nové tabuľky nesmú byť dostupné cez verejné Supabase API.
ALTER TABLE "ProjectIssue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IssuePhoto" ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE
  api_role TEXT;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON TABLE "ProjectIssue" FROM %I', api_role);
      EXECUTE format('REVOKE ALL ON TABLE "IssuePhoto" FROM %I', api_role);
    END IF;
  END LOOP;
END
$$;
