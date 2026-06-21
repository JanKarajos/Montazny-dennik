const SYSTEM_ROLE_NAMES = new Set(["Vedúci montáže", "Technik"]);

export function isSystemRoleName(roleName: string): boolean {
  return SYSTEM_ROLE_NAMES.has(roleName.trim());
}