import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionPermissionContext, hasSessionPermission } from "@/lib/api-permissions";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, "Nové heslo musí mať aspoň 8 znakov."),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const permissionContext = await getSessionPermissionContext();
  if (!permissionContext || !hasSessionPermission(permissionContext, "RESET_USER_PASSWORDS")) {
    return NextResponse.json({ message: "Nemáte oprávnenie meniť heslá používateľov." }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const parsed = resetPasswordSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Neplatné údaje." }, { status: 400 });
    }

    const passwordHash = await hashPassword(parsed.data.newPassword);

    const updated = await prisma.user.update({
      where: { id },
      data: {
        password: passwordHash,
        requiresPasswordChange: true,
      },
      select: {
        id: true,
        email: true,
      },
    });

    return NextResponse.json({
      id: updated.id,
      email: updated.email,
      requiresPasswordChange: true,
      message: "Heslo používateľa bolo zmenené. Pri ďalšom prihlásení bude vyžadovaná zmena hesla.",
    });
  } catch {
    return NextResponse.json({ message: "Nepodarilo sa zmeniť heslo používateľa." }, { status: 500 });
  }
}
