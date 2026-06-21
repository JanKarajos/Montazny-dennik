import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionPermissionContext, hasSessionPermission } from "@/lib/api-permissions";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const signSchema = z.object({
  party: z.enum(["employee", "customer"]),
  signatureData: z
    .string()
    .regex(/^data:image\/(png|jpeg);base64,/, "Neplatný formát podpisu.")
    .min(100, "Podpis je povinný."),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ message: "Najprv sa prihláste." }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const parsed = signSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Neplatné údaje." }, { status: 400 });
    }

    const now = new Date();

    if (parsed.data.party === "employee") {
      const result = await prisma.project.updateMany({
        where: {
          id,
          employeeSignedAt: null,
        },
        data: {
          employeeSignature: parsed.data.signatureData,
          employeeSignedAt: now,
        },
      });

      if (result.count === 0) {
        return NextResponse.json({ message: "Podpis zamestnanca už bol uložený alebo zákazka neexistuje." }, { status: 409 });
      }

      const project = await prisma.project.findUnique({
        where: { id },
        select: {
          employeeSignature: true,
          employeeSignedAt: true,
        },
      });

      return NextResponse.json({
        employeeSignature: project?.employeeSignature,
        employeeSignedAt: project?.employeeSignedAt,
      });
    }

    const result = await prisma.project.updateMany({
      where: {
        id,
        customerSignedAt: null,
      },
      data: {
        customerSignature: parsed.data.signatureData,
        customerSignedAt: now,
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ message: "Podpis zákazníka už bol uložený alebo zákazka neexistuje." }, { status: 409 });
    }

    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        customerSignature: true,
        customerSignedAt: true,
      },
    });

    return NextResponse.json({
      customerSignature: project?.customerSignature,
      customerSignedAt: project?.customerSignedAt,
    });
  } catch {
    return NextResponse.json({ message: "Podpis sa nepodarilo uložiť." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const permissionContext = await getSessionPermissionContext();
  if (!permissionContext || !hasSessionPermission(permissionContext, "UNLOCK_PROJECT")) {
    return NextResponse.json({ message: "Nemáte oprávnenie odomknúť zákazku." }, { status: 403 });
  }

  try {
    const { id } = await context.params;

    const updated = await prisma.project.update({
      where: { id },
      data: {
        employeeSignature: null,
        employeeSignedAt: null,
        customerSignature: null,
        customerSignedAt: null,
      },
      select: {
        employeeSignature: true,
        employeeSignedAt: true,
        customerSignature: true,
        customerSignedAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ message: "Nepodarilo sa odomknúť zákazku." }, { status: 500 });
  }
}
