import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionPermissionContext, hasSessionPermission } from "@/lib/api-permissions";
import { prisma } from "@/lib/prisma";

const updateProjectSchema = z.object({
  projectNumber: z.string().min(1, "Číslo zákazky je povinné.").max(50),
  name: z.string().min(2, "Názov zákazky je povinný.").max(200),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const permissionContext = await getSessionPermissionContext();
  if (!permissionContext || !hasSessionPermission(permissionContext, "EDIT_PROJECT")) {
    return NextResponse.json({ message: "Nemáte oprávnenie upravovať zákazku." }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Neplatné údaje." }, { status: 400 });
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        projectNumber: parsed.data.projectNumber.trim(),
        name: parsed.data.name.trim(),
      },
      select: {
        id: true,
        projectNumber: true,
        name: true,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ message: "Nepodarilo sa uložiť zákazku." }, { status: 500 });
  }
}
