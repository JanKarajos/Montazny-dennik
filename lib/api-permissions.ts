import { getCurrentSession } from "@/lib/auth";
import { PermissionCode, isPermissionCode } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export type SessionPermissionContext = {
  userId: string;
  permissionCodes: PermissionCode[];
};

export async function getSessionPermissionContext(): Promise<SessionPermissionContext | null> {
  const session = await getCurrentSession();

  if (!session) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      permissions: {
        select: { code: true },
      },
    },
  });

  if (!user) {
    return null;
  }

  return {
    userId: user.id,
    permissionCodes: user.permissions
      .map((permission) => permission.code)
      .filter((code): code is PermissionCode => isPermissionCode(code)),
  };
}

export function hasSessionPermission(context: SessionPermissionContext, permission: PermissionCode): boolean {
  return context.permissionCodes.includes(permission);
}
