import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession, hashPassword, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const changeOwnPasswordSchema = z.object({
  currentPassword: z.string().min(1, "Aktuálne heslo je povinné."),
  newPassword: z.string().min(8, "Nové heslo musí mať aspoň 8 znakov."),
  confirmNewPassword: z.string().min(8, "Potvrdenie nového hesla je povinné."),
});

export async function PATCH(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ message: "Najprv sa prihláste." }, { status: 401 });
  }

  try {
    const parsed = changeOwnPasswordSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Neplatné údaje." }, { status: 400 });
    }

    if (parsed.data.newPassword !== parsed.data.confirmNewPassword) {
      return NextResponse.json({ message: "Nové heslá sa nezhodujú." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, password: true },
    });

    if (!user) {
      return NextResponse.json({ message: "Používateľ neexistuje." }, { status: 404 });
    }

    const currentPasswordMatches = await verifyPassword(parsed.data.currentPassword, user.password);
    if (!currentPasswordMatches) {
      return NextResponse.json({ message: "Aktuálne heslo nie je správne." }, { status: 400 });
    }

    const nextPasswordHash = await hashPassword(parsed.data.newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: nextPasswordHash,
        requiresPasswordChange: false,
      },
    });

    return NextResponse.json({ message: "Heslo bolo úspešne zmenené." });
  } catch {
    return NextResponse.json({ message: "Nepodarilo sa zmeniť heslo." }, { status: 500 });
  }
}
