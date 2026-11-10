-- Osoby na montáži / servise: zoznam osôb a osoby priradené k zákazke.
-- Migrácia je idempotentná, aby ju bolo možné bezpečne spustiť aj viackrát.
CREATE TABLE IF NOT EXISTS "Person" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Person_name_key" ON "Person"("name");

CREATE TABLE IF NOT EXISTS "ProjectPerson" (
  "id" UUID NOT NULL,
  "projectId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectPerson_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProjectPerson_projectId_name_key" ON "ProjectPerson"("projectId", "name");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProjectPerson_projectId_fkey') THEN
    ALTER TABLE "ProjectPerson" ADD CONSTRAINT "ProjectPerson_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- Nové tabuľky nesmú byť dostupné cez verejné Supabase API.
ALTER TABLE "Person" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectPerson" ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE
  api_role TEXT;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON TABLE "Person" FROM %I', api_role);
      EXECUTE format('REVOKE ALL ON TABLE "ProjectPerson" FROM %I', api_role);
    END IF;
  END LOOP;
END
$$;

-- Nové oprávnenie na správu zoznamu osôb; systémová rola „Vedúci montáže“ ho dostane hneď.
INSERT INTO "Permission" ("id", "code", "description")
SELECT gen_random_uuid(), 'MANAGE_PERSONS', 'Správa zoznamu osôb na montáž a servis'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE "code" = 'MANAGE_PERSONS');

INSERT INTO "_RolePermissions" ("A", "B")
SELECT p."id", r."id"
FROM "Permission" p
JOIN "Role" r ON r."name" = 'Vedúci montáže'
WHERE p."code" = 'MANAGE_PERSONS'
  AND NOT EXISTS (
    SELECT 1 FROM "_RolePermissions" rp WHERE rp."A" = p."id" AND rp."B" = r."id"
  );
