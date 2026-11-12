import { NextResponse } from "next/server";
import { getSessionPermissionContext, hasSessionPermission } from "@/lib/api-permissions";
import { issueTextSchema } from "@/lib/issues";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Nahlásenie problému na zákazke. Problémy sa dajú dopĺňať aj po ukončení zákazky.
export async function POST(request: Request, context: RouteContext) {
  const permissionContext = await getSessionPermissionContext();
  if (!permissionContext || !hasSessionPermission(permissionContext, "ADD_LOGS")) {
    return NextResponse.json({ message: "Nemáte oprávnenie pridávať problémy." }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const parsed = issueTextSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Neplatné údaje." }, { status: 400 });
    }

    const project = await prisma.project.findUnique({ where: { id }, select: { id: true } });
    if (!project) {
      return NextResponse.json({ message: "Zákazka neexistuje." }, { status: 404 });
    }

    const isResolved = parsed.data.status === "RESOLVED";
    const issue = await prisma.projectIssue.create({
      data: {
        projectId: id,
        title: parsed.data.title,
        description: parsed.data.description,
        resolution: parsed.data.resolution,
        status: parsed.data.status,
        createdById: permissionContext.userId,
        resolvedById: isResolved ? permissionContext.userId : null,
        resolvedAt: isResolved ? new Date() : null,
      },
      select: { id: true },
    });

    return NextResponse.json(issue, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Problém sa nepodarilo uložiť." }, { status: 500 });
  }
}
