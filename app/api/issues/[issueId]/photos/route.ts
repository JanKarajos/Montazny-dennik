import { NextResponse } from "next/server";
import { getSessionPermissionContext, hasSessionPermission } from "@/lib/api-permissions";
import { detectImageType } from "@/lib/image-type";
import { MAX_ISSUE_PHOTO_SIZE, MAX_ISSUE_PHOTOS, MAX_ISSUE_THUMBNAIL_SIZE } from "@/lib/issues";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ issueId: string }>;
};

function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[\\/\r\n"]/g, "_").trim();
  return cleaned.slice(-150) || "fotka.jpg";
}

// Nahratie jednej fotky (s voliteľným náhľadom) k problému.
export async function POST(request: Request, context: RouteContext) {
  const permissionContext = await getSessionPermissionContext();
  if (!permissionContext || !hasSessionPermission(permissionContext, "ADD_LOGS")) {
    return NextResponse.json({ message: "Nemáte oprávnenie pridávať fotky." }, { status: 403 });
  }

  try {
    const { issueId } = await context.params;
    const formData = await request.formData();
    const file = formData.get("file");
    const thumbnail = formData.get("thumbnail");
    const kind = formData.get("kind") === "RESOLUTION" ? "RESOLUTION" : "PROBLEM";

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ message: "Vyberte fotku." }, { status: 400 });
    }
    if (file.size > MAX_ISSUE_PHOTO_SIZE) {
      return NextResponse.json({ message: "Fotka je príliš veľká (maximum 3 MB)." }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const mimeType = detectImageType(bytes);
    if (!mimeType) {
      return NextResponse.json({ message: "Povolené sú iba fotky JPG, PNG alebo WebP." }, { status: 400 });
    }

    let thumbnailBytes: Uint8Array<ArrayBuffer> | null = null;
    if (thumbnail instanceof File && thumbnail.size > 0 && thumbnail.size <= MAX_ISSUE_THUMBNAIL_SIZE) {
      const candidate = new Uint8Array(await thumbnail.arrayBuffer());
      thumbnailBytes = detectImageType(candidate) ? candidate : null;
    }

    const issue = await prisma.projectIssue.findUnique({
      where: { id: issueId },
      select: { _count: { select: { photos: true } } },
    });
    if (!issue) {
      return NextResponse.json({ message: "Problém neexistuje." }, { status: 404 });
    }
    if (issue._count.photos >= MAX_ISSUE_PHOTOS) {
      return NextResponse.json({ message: `K problému je možné nahrať najviac ${MAX_ISSUE_PHOTOS} fotiek.` }, { status: 400 });
    }

    const photo = await prisma.issuePhoto.create({
      data: {
        issueId,
        kind,
        fileName: sanitizeFileName(file.name),
        mimeType,
        size: bytes.length,
        data: bytes,
        thumbnail: thumbnailBytes,
        uploadedById: permissionContext.userId,
      },
      select: { id: true },
    });

    return NextResponse.json(photo, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Fotku sa nepodarilo nahrať." }, { status: 500 });
  }
}
