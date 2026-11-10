import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionPermissionContext, hasSessionPermission } from "@/lib/api-permissions";
import { prisma } from "@/lib/prisma";

const roleSchema = z.object({
  roleId: z.string().min(1),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const permissionContext = await getSessionPermissionContext();
  if (!permissionContext || !hasSessionPermission(permissionContext, "MANAGE_USERS")) {
    return NextResponse.json({ message: "Nemáte oprávnenie." }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = roleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: "Neplatná rola." }, { status: 400 });
    }

    const roleExists = await prisma.role.findUnique({
      where: { id: parsed.data.roleId },
      select: { id: true, permissions: { select: { code: true } } },
    });
    if (!roleExists) {
      return NextResponse.json({ message: "Zvolená rola neexistuje." }, { status: 400 });
    }

    // Správca si nesmie zmenou vlastnej roly odobrať správu používateľov.
    if (id === permissionContext.userId) {
      const user = await prisma.user.findUnique({
        where: { id },
        select: { permissions: { select: { code: true } } },
      });
      const keepsManageUsers = [...roleExists.permissions, ...(user?.permissions ?? [])].some(
        (permission) => permission.code === "MANAGE_USERS",
      );
      if (!keepsManageUsers) {
        return NextResponse.json(
          { message: "Vlastnému účtu nemôžete odobrať oprávnenie na správu používateľov a rolí." },
          { status: 400 },
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { roleId: parsed.data.roleId },
      select: {
        id: true,
        name: true,
        email: true,
        roleId: true,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ message: "Nepodarilo sa zmeniť rolu." }, { status: 500 });
  }
}
