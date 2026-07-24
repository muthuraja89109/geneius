/**
 * Downscales and re-compresses an image file in the browser before upload.
 * Prevents "413 Request Entity Too Large" errors from large screenshots —
 * Groq's vision API (like most vision APIs) has a request-size ceiling once
 * the image is base64-encoded, and full-page screenshots easily blow past it.
 */

const MAX_DIMENSION = 1568; // matches common vision-model input limits
const JPEG_QUALITY = 0.82;
const SKIP_RESIZE_UNDER_BYTES = 800 * 1024; // small images: don't bother

export async function resizeImageFile(file) {
  if (!file || !file.type.startsWith("image/")) return file;
  if (file.size < SKIP_RESIZE_UNDER_BYTES) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    if (!blob) return file;

    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg" });
  } catch {
    // If resizing fails for any reason, fall back to the original file
    // rather than blocking the user's upload.
    return file;
  }
}