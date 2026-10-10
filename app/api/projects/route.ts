import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionPermissionContext, hasSessionPermission } from "@/lib/api-permissions";
import { DIARY_TYPES } from "@/lib/diary-types";
import { isUniqueConstraintError, prisma } from "@/lib/prisma";

const projectSchema = z.object({
  projectNumber: z.string().min(1, "Číslo zákazky je povinné.").max(50),
  name: z.string().min(2, "Názov zákazky je povinný.").max(200),
  type: z.enum(DIARY_TYPES).default("ASSEMBLY"),
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
        type: parsed.data.type,
        projectNumber: parsed.data.projectNumber.trim(),
        name: parsed.data.name.trim(),
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ message: "Zákazka s týmto číslom už existuje." }, { status: 409 });
    }
    return NextResponse.json({ message: "Nepodarilo sa vytvoriť zákazku." }, { status: 500 });
  }
}
