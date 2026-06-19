import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function normalizePostgresUrl(value: string | undefined): string | undefined {
  if (!value) return value;

  const schemeMatch = value.match(/^(postgres(?:ql)?:\/\/)/i);
  if (!schemeMatch) return value;

  const scheme = schemeMatch[1];
  const authorityStart = scheme.length;
  const authorityEnd = value.indexOf("/", authorityStart);
  const safeAuthorityEnd = authorityEnd === -1 ? value.length : authorityEnd;

  const authority = value.slice(authorityStart, safeAuthorityEnd);
  const atIndex = authority.lastIndexOf("@");
  if (atIndex === -1) return value;

  const userInfo = authority.slice(0, atIndex);
  const hostInfo = authority.slice(atIndex + 1);
  const userSeparator = userInfo.indexOf(":");
  if (userSeparator === -1) return value;

  const username = userInfo.slice(0, userSeparator);
  let rawPassword = userInfo.slice(userSeparator + 1);

  if (rawPassword.startsWith("[") && rawPassword.endsWith("]")) {
    rawPassword = rawPassword.slice(1, -1);
  }

  let encodedPassword: string;
  try {
    encodedPassword = encodeURIComponent(decodeURIComponent(rawPassword));
  } catch {
    encodedPassword = encodeURIComponent(rawPassword);
  }

  const suffix = value.slice(safeAuthorityEnd);
  return `${scheme}${username}:${encodedPassword}@${hostInfo}${suffix}`;
}

function getRawEnvValueFromFile(filePath: string, key: string): string | undefined {
  if (!existsSync(filePath)) return undefined;
  const content = readFileSync(filePath, "utf8");
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = content.match(new RegExp(`^${escapedKey}=(.*)$`, "m"));
  if (!match) return undefined;

  const raw = match[1].trim();
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    return raw.slice(1, -1);
  }

  return raw;
}

function resolveDatabaseUrl(): string | undefined {
  const normalizedEnv = normalizePostgresUrl(process.env.DATABASE_URL);
  if (normalizedEnv?.startsWith("postgres://") || normalizedEnv?.startsWith("postgresql://")) {
    return normalizedEnv;
  }

  const rawFromLocalEnv = getRawEnvValueFromFile(".env.local", "DATABASE_URL");
  const normalizedLocal = normalizePostgresUrl(rawFromLocalEnv);
  if (normalizedLocal?.startsWith("postgres://") || normalizedLocal?.startsWith("postgresql://")) {
    return normalizedLocal;
  }

  const rawFromEnv = getRawEnvValueFromFile(".env", "DATABASE_URL");
  return normalizePostgresUrl(rawFromEnv);
}

process.env.DATABASE_URL = resolveDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
