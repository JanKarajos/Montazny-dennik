import { NextResponse } from "next/server";
import { getSessionPermissionContext, hasSessionPermission } from "@/lib/api-permissions";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Ukončenie zákazky bez podpisu.
export async function POST(_request: Request, context: RouteContext) {
  const permissionContext = await getSessionPermissionContext();
  if (!permissionContext || !hasSessionPermission(permissionContext, "EDIT_PROJECT")) {
    return NextResponse.json({ message: "Nemáte oprávnenie ukončiť zákazku." }, { status: 403 });
  }

  try {
    const { id } = await context.params;

    const result = await prisma.project.updateMany({
      where: { id, completedAt: null },
      data: {
        completedAt: new Date(),
        completionMethod: "WITHOUT_SIGNATURE",
        completedById: permissionContext.userId,
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ message: "Zákazka je už ukončená alebo neexistuje." }, { status: 409 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Nepodarilo sa ukončiť zákazku." }, { status: 500 });
  }
}
