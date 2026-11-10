import { NextResponse } from "next/server";
import { getSessionPermissionContext, hasSessionPermission } from "@/lib/api-permissions";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string; personId: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const permissionContext = await getSessionPermissionContext();
  if (!permissionContext || !hasSessionPermission(permissionContext, "ADD_LOGS")) {
    return NextResponse.json({ message: "Nemáte oprávnenie odoberať osoby zo zákazky." }, { status: 403 });
  }

  try {
    const { id, personId } = await context.params;

    const project = await prisma.project.findUnique({ where: { id }, select: { completedAt: true } });
    if (!project) {
      return NextResponse.json({ message: "Zákazka neexistuje." }, { status: 404 });
    }
    if (project.completedAt) {
      return NextResponse.json({ message: "Zákazka je ukončená a uzamknutá." }, { status: 409 });
    }

    await prisma.projectPerson.deleteMany({ where: { id: personId, projectId: id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Osobu sa nepodarilo odobrať." }, { status: 500 });
  }
}
