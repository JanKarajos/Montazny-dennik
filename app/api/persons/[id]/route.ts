import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionPermissionContext, hasSessionPermission } from "@/lib/api-permissions";
import { personNameSchema } from "@/lib/person-name";
import { isUniqueConstraintError, prisma } from "@/lib/prisma";

const updatePersonSchema = z.object({ name: personNameSchema });

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const permissionContext = await getSessionPermissionContext();
  if (!permissionContext || !hasSessionPermission(permissionContext, "MANAGE_PERSONS")) {
    return NextResponse.json({ message: "Nemáte oprávnenie upravovať zoznam osôb." }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const parsed = updatePersonSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Neplatné údaje." }, { status: 400 });
    }

    const person = await prisma.person.update({
      where: { id },
      data: { name: parsed.data.name },
      select: { id: true, name: true },
    });
    return NextResponse.json(person);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ message: "Osoba s týmto menom už v zozname je." }, { status: 409 });
    }
    return NextResponse.json({ message: "Osobu sa nepodarilo upraviť." }, { status: 500 });
  }
}

// Odstráni osobu iba zo zoznamu; zákazky, kde už je zapísaná, zostanú nezmenené.
export async function DELETE(_request: Request, context: RouteContext) {
  const permissionContext = await getSessionPermissionContext();
  if (!permissionContext || !hasSessionPermission(permissionContext, "MANAGE_PERSONS")) {
    return NextResponse.json({ message: "Nemáte oprávnenie upravovať zoznam osôb." }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    await prisma.person.deleteMany({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Osobu sa nepodarilo odstrániť." }, { status: 500 });
  }
}
