import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionPermissionContext, hasSessionPermission } from "@/lib/api-permissions";
import { isPermissionCode } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const updatePermissionSchema = z.object({
  code: z.string().min(1),
  enabled: z.boolean(),
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
    const parsed = updatePermissionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: "Neplatné údaje." }, { status: 400 });
    }

    if (!isPermissionCode(parsed.data.code)) {
      return NextResponse.json({ message: "Neplatný kód oprávnenia." }, { status: 400 });
    }

    const permission = await prisma.permission.findUnique({
      where: { code: parsed.data.code },
      select: { id: true },
    });

    if (!permission) {
      return NextResponse.json({ message: "Oprávnenie neexistuje." }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        permissions: parsed.data.enabled
          ? { connect: { id: permission.id } }
          : { disconnect: { id: permission.id } },
      },
      select: {
        id: true,
        permissions: {
          select: {
            code: true,
          },
        },
      },
    });

    return NextResponse.json({
      id: updated.id,
      permissions: updated.permissions.map((item) => item.code),
    });
  } catch {
    return NextResponse.json({ message: "Nepodarilo sa uložiť oprávnenie." }, { status: 500 });
  }
}
