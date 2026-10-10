// Aplikuje čakajúce databázové migrácie (spúšťa sa ručne: `npm run db:apply`).
// Vercel spúšťa iba `next build`, preto treba schému po nasadení aktualizovať.
// Skript používa rovnaké pripojenie ako aplikácia (DATABASE_URL), migrácie sú
// idempotentné a po úspechu sa zapíšu do `_prisma_migrations`, takže neskorší
// `prisma migrate deploy` ich už znova nespúšťa.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "../lib/prisma";

const MANAGED_MIGRATIONS = ["20261010120000_service_diary", "20261010130000_enable_rls"];

function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inDollarBlock = false;

  for (const line of sql.split("\n")) {
    if (!inDollarBlock && line.trim().startsWith("--")) {
      continue;
    }

    current += `${line}\n`;
    const dollarCount = line.split("$$").length - 1;
    if (dollarCount % 2 === 1) {
      inDollarBlock = !inDollarBlock;
    }

    if (!inDollarBlock && line.trimEnd().endsWith(";")) {
      statements.push(current.trim());
      current = "";
    }
  }

  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements;
}

async function migrationsTableExists(): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
    `SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS "exists"`,
  );
  return Boolean(rows[0]?.exists);
}

async function isApplied(name: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT count(*) AS "count" FROM "_prisma_migrations"
     WHERE migration_name = $1 AND finished_at IS NOT NULL AND rolled_back_at IS NULL`,
    name,
  );
  return Number(rows[0]?.count ?? 0) > 0;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("[db-migrations] Chýba DATABASE_URL.");
  }

  const hasMigrationsTable = await migrationsTableExists();

  for (const name of MANAGED_MIGRATIONS) {
    if (hasMigrationsTable && (await isApplied(name))) {
      console.log(`[db-migrations] ${name}: už aplikovaná.`);
      continue;
    }

    const sql = readFileSync(path.join(process.cwd(), "prisma", "migrations", name, "migration.sql"), "utf8");
    const statements = splitSqlStatements(sql);

    for (const statement of statements) {
      await prisma.$executeRawUnsafe(statement);
    }

    if (hasMigrationsTable) {
      const checksum = createHash("sha256").update(sql).digest("hex");
      await prisma.$executeRawUnsafe(
        `INSERT INTO "_prisma_migrations"
           (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
         SELECT gen_random_uuid()::text, $1, now(), $2, now(), 1
         WHERE NOT EXISTS (
           SELECT 1 FROM "_prisma_migrations"
           WHERE migration_name = $2 AND finished_at IS NOT NULL AND rolled_back_at IS NULL
         )`,
        checksum,
        name,
      );
    }

    console.log(`[db-migrations] ${name}: aplikovaná (${statements.length} príkazov).`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
