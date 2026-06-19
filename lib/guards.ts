import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { PermissionCode, isPermissionCode } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function requireUser() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      role: {
        select: {
          id: true,
          name: true,
        },
      },
      permissions: {
        select: { code: true },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  const effectivePermissionCodes = user.permissions
    .map((permission) => permission.code)
    .filter((code): code is PermissionCode => isPermissionCode(code));

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissionCodes: effectivePermissionCodes,
  };
}

export async function requirePermission(permission: PermissionCode) {
  const user = await requireUser();
  if (!user.permissionCodes.includes(permission)) {
    redirect("/");
  }

  return user;
}

export async function requireManageUsers() {
  return requirePermission("MANAGE_USERS");
}

export function hasPermission(user: { permissionCodes: PermissionCode[] }, permission: PermissionCode): boolean {
  return user.permissionCodes.includes(permission);
}
