'use client'

/**
 * Shrink a camera photo before it is uploaded.
 *
 * Two costs this cuts. Storage: a raw iPhone photo is 2–4 MB and a wine label
 * needs a fraction of that. Tokens: the vision API bills roughly
 * width × height / 750, so pixels are money — and anything with a long edge
 * over 1568px is downscaled server-side anyway, making the extra bytes pure
 * waste in both directions.
 *
 * 1400px keeps small print legible — producer names, appellations, ABV — while
 * landing around 250 KB.
 *
 * It also converts to JPEG, which matters more than it looks: photos out of an
 * iPhone library can be HEIC, and the vision API does not accept HEIC.
 */
const MAX_EDGE = 1400
const QUALITY = 0.82

export async function resizeImage(file: File): Promise<File> {
  try {
    // `from-image` applies EXIF rotation. Without it, portrait phone photos
    // arrive sideways and the label is unreadable to both of you and the model.
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })

    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', QUALITY),
    )
    if (!blob) return file

    // A photo already small and already JPEG gains nothing from the round trip.
    if (blob.size >= file.size && file.type === 'image/jpeg') return file

    return new File([blob], 'label.jpg', { type: 'image/jpeg' })
  } catch {
    // Never block the upload on this. A large original still works; it just
    // costs more.
    return file
  }
}
