import { NextResponse } from "next/server";
import { getSessionPermissionContext, hasSessionPermission } from "@/lib/api-permissions";
import { detectImageType } from "@/lib/image-type";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ photoId: string }>;
};

// Fotka problému; s ?thumb=1 vráti náhľad (ak existuje).
export async function GET(request: Request, context: RouteContext) {
  const permissionContext = await getSessionPermissionContext();
  if (!permissionContext || !hasSessionPermission(permissionContext, "VIEW_PROJECTS")) {
    return NextResponse.json({ message: "Nemáte oprávnenie." }, { status: 403 });
  }

  try {
    const { photoId } = await context.params;
    const wantsThumbnail = new URL(request.url).searchParams.get("thumb") === "1";

    const photo = await prisma.issuePhoto.findUnique({
      where: { id: photoId },
      select: { mimeType: true, data: !wantsThumbnail, thumbnail: wantsThumbnail },
    });
    if (!photo) {
      return NextResponse.json({ message: "Fotka neexistuje." }, { status: 404 });
    }

    let bytes = wantsThumbnail ? photo.thumbnail : photo.data;
    if (!bytes) {
      // Náhľad chýba – vrátime pôvodnú fotku.
      const full = await prisma.issuePhoto.findUnique({ where: { id: photoId }, select: { data: true } });
      bytes = full?.data ?? null;
    }
    if (!bytes) {
      return NextResponse.json({ message: "Fotka neexistuje." }, { status: 404 });
    }

    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": detectImageType(bytes) ?? photo.mimeType,
        // Obsah fotky sa pod rovnakým ID nikdy nemení.
        "Cache-Control": "private, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ message: "Fotku sa nepodarilo načítať." }, { status: 500 });
  }
}

// Vymazať fotku môže ten, kto ju nahral, autor problému alebo správca záznamov.
export async function DELETE(_request: Request, context: RouteContext) {
  const permissionContext = await getSessionPermissionContext();
  if (!permissionContext) {
    return NextResponse.json({ message: "Najprv sa prihláste." }, { status: 401 });
  }

  try {
    const { photoId } = await context.params;
    const photo = await prisma.issuePhoto.findUnique({
      where: { id: photoId },
      select: { uploadedById: true, issue: { select: { createdById: true } } },
    });
    if (!photo) {
      return NextResponse.json({ message: "Fotka neexistuje." }, { status: 404 });
    }

    const userId = permissionContext.userId;
    const canDelete =
      hasSessionPermission(permissionContext, "MANAGE_ALL_LOGS") ||
      photo.uploadedById === userId ||
      photo.issue.createdById === userId;
    if (!canDelete) {
      return NextResponse.json({ message: "Nemáte oprávnenie vymazať túto fotku." }, { status: 403 });
    }

    await prisma.issuePhoto.delete({ where: { id: photoId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Fotku sa nepodarilo vymazať." }, { status: 500 });
  }
}
