import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionPermissionContext, hasSessionPermission } from "@/lib/api-permissions";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const userCreateSchema = z.object({
  name: z.string().min(2, "Meno je povinné."),
  email: z.string().email("Neplatný email."),
  password: z.string().min(6, "Heslo musí mať aspoň 6 znakov."),
  roleId: z.string().min(1, "Rola je povinná."),
});

export async function POST(request: Request) {
  const context = await getSessionPermissionContext();
  if (!context || !hasSessionPermission(context, "MANAGE_USERS")) {
    return NextResponse.json({ message: "Nemáte oprávnenie." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = userCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Neplatné údaje." }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ message: "Používateľ s týmto emailom už existuje." }, { status: 409 });
    }

    const role = await prisma.role.findUnique({
      where: { id: parsed.data.roleId },
      select: {
        id: true,
        permissions: {
          select: { id: true },
        },
      },
    });
    if (!role) {
      return NextResponse.json({ message: "Zvolená rola neexistuje." }, { status: 400 });
    }

    const password = await hashPassword(parsed.data.password);

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name.trim(),
        email,
        password,
        roleId: parsed.data.roleId,
        permissions: {
          connect: role.permissions.map((permission) => ({ id: permission.id })),
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        roleId: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Nepodarilo sa vytvoriť používateľa." }, { status: 500 });
  }
}
