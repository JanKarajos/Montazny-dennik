export const CORE_PERMISSION_CODES = [
  "VIEW_PROJECTS",
  "CREATE_PROJECTS",
  "EDIT_PROJECT",
  "ADD_LOGS",
  "MANAGE_USERS",
] as const;

export type PermissionCode = (typeof CORE_PERMISSION_CODES)[number];

export type PermissionItem = {
  code: PermissionCode;
  description: string;
};

export const CORE_PERMISSIONS: PermissionItem[] = [
  { code: "VIEW_PROJECTS", description: "Zobrazenie zákaziek" },
  { code: "CREATE_PROJECTS", description: "Vytváranie nových zákaziek" },
  { code: "EDIT_PROJECT", description: "Úprava čísla a názvu zákazky" },
  { code: "ADD_LOGS", description: "Pridávanie záznamov prác" },
  { code: "MANAGE_USERS", description: "Správa používateľov a rolí" },
];

export function isPermissionCode(value: string): value is PermissionCode {
  return CORE_PERMISSION_CODES.includes(value as PermissionCode);
}

export function getEffectivePermissionCodes(input: {
  rolePermissions: string[];
  userPermissions: string[];
}): PermissionCode[] {
  const merged = new Set<string>([...input.rolePermissions, ...input.userPermissions]);
  return Array.from(merged).filter((code): code is PermissionCode => isPermissionCode(code));
}
