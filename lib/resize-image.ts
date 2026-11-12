// Zmenšenie fotky v prehliadači pred nahratím (fotky z telefónu majú často 3–8 MB).

export type PreparedPhoto = {
  file: Blob;
  thumbnail: Blob | null;
  fileName: string;
};

const MAX_SIDE = 1600;
const THUMBNAIL_SIDE = 400;
const MAX_ORIGINAL_SIZE = 3 * 1024 * 1024;
const PASSTHROUGH_TYPES = ["image/jpeg", "image/png", "image/webp"];

type Drawable = { source: CanvasImageSource; width: number; height: number; release: () => void };

async function decode(file: File): Promise<Drawable> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    } catch {
      // Niektoré prehliadače nevedia dekódovať cez createImageBitmap – skúsime <img>.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function renderJpeg(drawable: Drawable, maxSide: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxSide / Math.max(drawable.width, drawable.height));
  const width = Math.max(1, Math.round(drawable.width * scale));
  const height = Math.max(1, Math.round(drawable.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    return Promise.reject(new Error("Fotku sa nepodarilo spracovať."));
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(drawable.source, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Fotku sa nepodarilo spracovať."))),
      "image/jpeg",
      quality,
    );
  });
}

function jpegFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "") || "fotka";
  return `${base}.jpg`;
}

export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  let drawable: Drawable;
  try {
    drawable = await decode(file);
  } catch {
    if (PASSTHROUGH_TYPES.includes(file.type) && file.size <= MAX_ORIGINAL_SIZE) {
      return { file, thumbnail: null, fileName: file.name };
    }
    throw new Error(`Fotku „${file.name}“ sa nepodarilo spracovať. Skúste ju uložiť ako JPG.`);
  }

  try {
    const [main, thumbnail] = await Promise.all([
      renderJpeg(drawable, MAX_SIDE, 0.82),
      renderJpeg(drawable, THUMBNAIL_SIDE, 0.75),
    ]);
    return { file: main, thumbnail, fileName: jpegFileName(file.name) };
  } finally {
    drawable.release();
  }
}
