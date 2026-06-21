export const CORE_PERMISSION_CODES = [
  "VIEW_PROJECTS",
  "CREATE_PROJECTS",
  "EDIT_PROJECT",
  "DELETE_PROJECT",
  "ADD_LOGS",
  "MANAGE_ALL_LOGS",
  "MANAGE_USERS",
  "RESET_USER_PASSWORDS",
  "UNLOCK_PROJECT",
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
  { code: "DELETE_PROJECT", description: "Mazanie zákaziek" },
  { code: "ADD_LOGS", description: "Pridávanie záznamov prác" },
  { code: "MANAGE_ALL_LOGS", description: "Správa všetkých záznamov prác" },
  { code: "MANAGE_USERS", description: "Správa používateľov a rolí" },
  { code: "RESET_USER_PASSWORDS", description: "Zmena hesiel používateľov adminom" },
  { code: "UNLOCK_PROJECT", description: "Odomknutie zákaziek a mazanie podpisov" },
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
