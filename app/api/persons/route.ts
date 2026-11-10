import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionPermissionContext, hasSessionPermission } from "@/lib/api-permissions";
import { personNameSchema } from "@/lib/person-name";
import { isUniqueConstraintError, prisma } from "@/lib/prisma";

const createPersonSchema = z.object({ name: personNameSchema });

export async function POST(request: Request) {
  const context = await getSessionPermissionContext();
  if (!context || !hasSessionPermission(context, "MANAGE_PERSONS")) {
    return NextResponse.json({ message: "Nemáte oprávnenie upravovať zoznam osôb." }, { status: 403 });
  }

  try {
    const parsed = createPersonSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Neplatné údaje." }, { status: 400 });
    }

    const person = await prisma.person.create({
      data: { name: parsed.data.name },
      select: { id: true, name: true },
    });
    return NextResponse.json(person, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ message: "Osoba s týmto menom už v zozname je." }, { status: 409 });
    }
    return NextResponse.json({ message: "Osobu sa nepodarilo pridať." }, { status: 500 });
  }
}
