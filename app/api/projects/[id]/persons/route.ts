import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionPermissionContext, hasSessionPermission } from "@/lib/api-permissions";
import { personNameSchema } from "@/lib/person-name";
import { isUniqueConstraintError, prisma } from "@/lib/prisma";

const addProjectPersonSchema = z.object({
  name: personNameSchema,
  addToList: z.boolean().optional().default(false),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Pridá osobu k zákazke – vybranú zo zoznamu alebo dopísanú ručne.
export async function POST(request: Request, context: RouteContext) {
  const permissionContext = await getSessionPermissionContext();
  if (!permissionContext || !hasSessionPermission(permissionContext, "ADD_LOGS")) {
    return NextResponse.json({ message: "Nemáte oprávnenie pridávať osoby k zákazke." }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const parsed = addProjectPersonSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Neplatné údaje." }, { status: 400 });
    }

    const project = await prisma.project.findUnique({ where: { id }, select: { completedAt: true } });
    if (!project) {
      return NextResponse.json({ message: "Zákazka neexistuje." }, { status: 404 });
    }
    if (project.completedAt) {
      return NextResponse.json({ message: "Zákazka je ukončená a uzamknutá." }, { status: 409 });
    }

    const { name, addToList } = parsed.data;
    const projectPerson = await prisma.projectPerson.create({
      data: { projectId: id, name },
      select: { id: true, name: true },
    });

    if (addToList && hasSessionPermission(permissionContext, "MANAGE_PERSONS")) {
      await prisma.person.upsert({ where: { name }, update: {}, create: { name } });
    }

    return NextResponse.json(projectPerson, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ message: "Táto osoba už je pri zákazke uvedená." }, { status: 409 });
    }
    return NextResponse.json({ message: "Osobu sa nepodarilo pridať k zákazke." }, { status: 500 });
  }
}
