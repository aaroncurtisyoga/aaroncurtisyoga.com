import sharp from "sharp";

/**
 * A tiny blurred placeholder for next/image, or "" when one can't be made.
 *
 * Always degrades rather than throwing: this runs during the render of a public
 * page, and a missing placeholder is not worth a 500. Synced classes carry no
 * imageUrl at all, which used to reach `fetch("")` and take the whole event
 * page down.
 */
export async function getBase64(imageUrl: string) {
  if (!imageUrl) return "";

  try {
    const res = await fetch(imageUrl);
    if (!res.ok) {
      throw new Error("Network response was not ok");
    }
    const buffer = await res.arrayBuffer();

    // Use sharp to create a small blurred placeholder image
    const resizedBuffer = await sharp(Buffer.from(buffer))
      .resize(10, 10, { fit: "inside" })
      .blur()
      .toBuffer();

    const base64 = `data:image/png;base64,${resizedBuffer.toString("base64")}`;
    return base64;
  } catch (error) {
    console.error("[getBase64] Could not build a placeholder:", error);
    return "";
  }
}
