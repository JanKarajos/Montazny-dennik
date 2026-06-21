import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionPermissionContext, hasSessionPermission } from "@/lib/api-permissions";
import { CORE_PERMISSION_CODES } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { isSystemRoleName } from "@/lib/system-roles";

const createRoleSchema = z.object({
  name: z.string().min(2, "Názov role je povinný."),
  permissionCodes: z.array(z.enum(CORE_PERMISSION_CODES)).default([]),
});

export async function POST(request: Request) {
  const permissionContext = await getSessionPermissionContext();
  if (!permissionContext || !hasSessionPermission(permissionContext, "MANAGE_USERS")) {
    return NextResponse.json({ message: "Nemáte oprávnenie." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createRoleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Neplatné údaje." }, { status: 400 });
    }

    const roleName = parsed.data.name.trim();

    const existing = await prisma.role.findUnique({ where: { name: roleName }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ message: "Rola s týmto názvom už existuje." }, { status: 409 });
    }

    const permissions = await prisma.permission.findMany({
      where: { code: { in: parsed.data.permissionCodes } },
      select: { id: true, code: true },
    });

    const role = await prisma.role.create({
      data: {
        name: roleName,
        permissions: {
          connect: permissions.map((permission) => ({ id: permission.id })),
        },
      },
      select: {
        id: true,
        name: true,
        permissions: {
          select: { code: true },
        },
      },
    });

    return NextResponse.json(
      {
        id: role.id,
        name: role.name,
        isSystem: isSystemRoleName(role.name),
        permissions: role.permissions.map((permission) => permission.code),
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ message: "Nepodarilo sa vytvoriť rolu." }, { status: 500 });
  }
}
