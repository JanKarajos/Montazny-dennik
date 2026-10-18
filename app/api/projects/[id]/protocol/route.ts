import { NextResponse } from "next/server";
import { getSessionPermissionContext, hasSessionPermission } from "@/lib/api-permissions";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Vercel obmedzuje telo požiadavky na 4,5 MB.
const MAX_PROTOCOL_SIZE = 4 * 1024 * 1024;

const ALLOWED_TYPES: { mimeType: string; matches: (bytes: Uint8Array) => boolean }[] = [
  { mimeType: "application/pdf", matches: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 },
  { mimeType: "image/png", matches: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { mimeType: "image/jpeg", matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
];

function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[\\/\r\n"]/g, "_").trim();
  return cleaned.slice(-150) || "protokol";
}

// Nahratie protokolu podpísaného na papieri – zákazka sa tým ukončí.
export async function POST(request: Request, context: RouteContext) {
  const permissionContext = await getSessionPermissionContext();
  if (!permissionContext || !hasSessionPermission(permissionContext, "VIEW_PROJECTS")) {
    return NextResponse.json({ message: "Nemáte oprávnenie." }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ message: "Vyberte súbor s podpísaným protokolom." }, { status: 400 });
    }

    if (file.size > MAX_PROTOCOL_SIZE) {
      return NextResponse.json({ message: "Súbor je príliš veľký (maximum 4 MB)." }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const fileType = ALLOWED_TYPES.find((type) => type.matches(bytes));
    if (!fileType) {
      return NextResponse.json({ message: "Povolené sú iba súbory PDF, JPG alebo PNG." }, { status: 400 });
    }

    const project = await prisma.project.findUnique({ where: { id }, select: { completedAt: true } });
    if (!project) {
      return NextResponse.json({ message: "Zákazka neexistuje." }, { status: 404 });
    }
    if (project.completedAt) {
      return NextResponse.json({ message: "Zákazka je už ukončená." }, { status: 409 });
    }

    const now = new Date();
    await prisma.$transaction([
      prisma.signedProtocol.upsert({
        where: { projectId: id },
        create: {
          projectId: id,
          fileName: sanitizeFileName(file.name),
          mimeType: fileType.mimeType,
          size: bytes.length,
          data: bytes,
          uploadedById: permissionContext.userId,
          uploadedAt: now,
        },
        update: {
          fileName: sanitizeFileName(file.name),
          mimeType: fileType.mimeType,
          size: bytes.length,
          data: bytes,
          uploadedById: permissionContext.userId,
          uploadedAt: now,
        },
      }),
      prisma.project.updateMany({
        where: { id, completedAt: null },
        data: {
          completedAt: now,
          completionMethod: "PAPER_PROTOCOL",
          completedById: permissionContext.userId,
        },
      }),
    ]);

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Protokol sa nepodarilo nahrať." }, { status: 500 });
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const permissionContext = await getSessionPermissionContext();
  if (!permissionContext || !hasSessionPermission(permissionContext, "VIEW_PROJECTS")) {
    return NextResponse.json({ message: "Nemáte oprávnenie." }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const protocol = await prisma.signedProtocol.findUnique({
      where: { projectId: id },
      select: { fileName: true, mimeType: true, data: true },
    });

    if (!protocol) {
      return NextResponse.json({ message: "Podpísaný protokol neexistuje." }, { status: 404 });
    }

    return new Response(Buffer.from(protocol.data), {
      headers: {
        "Content-Type": protocol.mimeType,
        "Content-Disposition": `attachment; filename="protokol"; filename*=UTF-8''${encodeURIComponent(protocol.fileName)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ message: "Protokol sa nepodarilo stiahnuť." }, { status: 500 });
  }
}
