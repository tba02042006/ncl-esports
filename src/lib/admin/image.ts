import sharp from "sharp";
/** Always decode and re-encode; never trust an uploaded extension or MIME declaration. */
export async function sanitizeImage(input: Uint8Array): Promise<Buffer> {
  if (input.byteLength > 3 * 1024 * 1024) throw new Error("Image exceeds 3 MB");
  const image = sharp(input, { limitInputPixels: 16777216, failOn: "warning" });
  const meta = await image.metadata();
  if (
    !["png", "jpeg", "webp"].includes(meta.format || "") ||
    (meta.pages ?? 1) > 1 ||
    !meta.width ||
    !meta.height
  )
    throw new Error("Unsupported or animated image");
  return image
    .rotate()
    .resize({
      width: 2048,
      height: 2048,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 85 })
    .toBuffer();
}
