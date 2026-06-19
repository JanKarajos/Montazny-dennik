import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, setSessionCookie, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  email: z.string().email("Neplatný email."),
  password: z.string().min(1, "Zadajte heslo."),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: "Neplatné prihlasovacie údaje." }, { status: 400 });
    }

    const email = parsed.data.email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ message: "Nesprávny email alebo heslo." }, { status: 401 });
    }

    const okPassword = await verifyPassword(parsed.data.password, user.password);

    if (!okPassword) {
      return NextResponse.json({ message: "Nesprávny email alebo heslo." }, { status: 401 });
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    await setSessionCookie(token);

    return NextResponse.json({ message: "Prihlásenie úspešné." });
  } catch {
    return NextResponse.json({ message: "Nepodarilo sa prihlásiť." }, { status: 500 });
  }
}
