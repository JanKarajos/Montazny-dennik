import { z } from "zod";

export const issueTextSchema = z.object({
  title: z.string().trim().min(3, "Názov problému musí mať aspoň 3 znaky.").max(150, "Názov problému je príliš dlhý."),
  description: z.string().trim().min(3, "Popíšte problém (aspoň 3 znaky).").max(5000, "Popis je príliš dlhý."),
  resolution: z
    .string()
    .trim()
    .max(5000, "Postup riešenia je príliš dlhý.")
    .optional()
    .transform((value) => (value ? value : null)),
  status: z.enum(["OPEN", "RESOLVED"]).default("OPEN"),
});

export const MAX_ISSUE_PHOTOS = 30;

// Vercel obmedzuje telo požiadavky na 4,5 MB; fotky sa zmenšujú už v prehliadači.
export const MAX_ISSUE_PHOTO_SIZE = 3 * 1024 * 1024;
export const MAX_ISSUE_THUMBNAIL_SIZE = 512 * 1024;
