import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionPermissionContext, hasSessionPermission } from "@/lib/api-permissions";
import { prisma } from "@/lib/prisma";

const projectSchema = z.object({
  projectNumber: z.string().min(1, "Číslo zákazky je povinné.").max(50),
  name: z.string().min(2, "Názov zákazky je povinný.").max(200),
});

export async function POST(request: Request) {
  const context = await getSessionPermissionContext();
  if (!context || !hasSessionPermission(context, "CREATE_PROJECTS")) {
    return NextResponse.json({ message: "Nemáte oprávnenie." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = projectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Neplatné údaje." }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        projectNumber: parsed.data.projectNumber.trim(),
        name: parsed.data.name.trim(),
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Nepodarilo sa vytvoriť zákazku." }, { status: 500 });
  }
}
