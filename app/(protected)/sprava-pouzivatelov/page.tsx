import { UserManagementClient } from "@/components/user-management-client";
import { CORE_PERMISSIONS } from "@/lib/permissions";
import { requireManageUsers } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

export default async function UserManagementPage() {
  await requireManageUsers();

  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        roleId: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        permissions: {
          select: {
            code: true,
          },
        },
      },
    }),
    prisma.role.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        permissions: {
          select: {
            code: true,
          },
        },
      },
    }),
  ]);

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Správa používateľov</h1>
        <p className="text-sm text-gray-600">
          Vytvárajte používateľov, role a nastavujte individuálne oprávnenia.
        </p>
      </div>

      <UserManagementClient
        users={users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          roleId: user.roleId,
          roleName: user.role?.name ?? "Bez role",
          permissions: user.permissions.map((permission) => permission.code),
        }))}
        roles={roles.map((role) => ({
          id: role.id,
          name: role.name,
          permissions: role.permissions.map((permission) => permission.code),
        }))}
        availablePermissions={CORE_PERMISSIONS}
      />
    </section>
  );
}
