import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, getCurrentSession, hashPassword, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const changePasswordSchema = z.object({
  newPassword: z.string().min(8, "Nové heslo musí mať aspoň 8 znakov."),
  confirmPassword: z.string().min(8, "Potvrdenie hesla je povinné."),
});

export async function PATCH(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ message: "Najprv sa prihláste." }, { status: 401 });
  }

  try {
    const parsed = changePasswordSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Neplatné údaje." }, { status: 400 });
    }

    if (parsed.data.newPassword !== parsed.data.confirmPassword) {
      return NextResponse.json({ message: "Heslá sa nezhodujú." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        requiresPasswordChange: true,
      },
    });

    if (!user) {
      return NextResponse.json({ message: "Používateľ neexistuje." }, { status: 404 });
    }

    if (!user.requiresPasswordChange) {
      return NextResponse.json({ message: "Zmena hesla nie je potrebná." }, { status: 400 });
    }

    const passwordHash = await hashPassword(parsed.data.newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: passwordHash,
        requiresPasswordChange: false,
      },
    });

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      requiresPasswordChange: false,
    });

    await setSessionCookie(token);

    return NextResponse.json({ message: "Heslo bolo úspešne zmenené." });
  } catch {
    return NextResponse.json({ message: "Nepodarilo sa zmeniť heslo." }, { status: 500 });
  }
}
