// Rozpozná typ obrázka podľa obsahu súboru (nie podľa prípony či hlavičky od klienta).
const IMAGE_SIGNATURES: { mimeType: string; matches: (bytes: Uint8Array) => boolean }[] = [
  { mimeType: "image/jpeg", matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mimeType: "image/png", matches: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  {
    mimeType: "image/webp",
    matches: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
];

export function detectImageType(bytes: Uint8Array): string | null {
  return IMAGE_SIGNATURES.find((signature) => signature.matches(bytes))?.mimeType ?? null;
}
