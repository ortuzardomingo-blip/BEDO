import imageCompression from 'browser-image-compression'

export const ACCEPT_IMAGES =
  'image/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.gif,.avif,.bmp,.tif,.tiff'

export interface ProcessedImage {
  full: Blob
  thumb: Blob
  width: number
  height: number
  takenAt: string | null
}

function isHeic(file: File) {
  return /image\/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)
}

export function isImageFile(file: File) {
  return file.type.startsWith('image/') || /\.(heic|heif|jpe?g|png|webp|gif|avif|bmp|tiff?)$/i.test(file.name)
}

async function readTakenAt(file: File): Promise<string | null> {
  try {
    const { default: exifr } = await import('exifr')
    const data = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate'])
    const d: unknown = data?.DateTimeOriginal ?? data?.CreateDate
    if (d instanceof Date && !isNaN(d.getTime())) {
      // Hora local de la foto (sin convertir a UTC) para agrupar bien por mes
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19)
    }
  } catch {
    /* sin EXIF */
  }
  return null
}

function dimensions(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      resolve({ width: 4, height: 3 })
      URL.revokeObjectURL(url)
    }
    img.src = url
  })
}

/**
 * Convierte (HEIC → JPEG), comprime y genera miniatura.
 * Las fotos del celular suelen pesar 3–10 MB; quedan en ~1 MB sin pérdida visible.
 */
export async function processImage(input: File): Promise<ProcessedImage> {
  const takenAt = await readTakenAt(input)
  let file: File = input

  if (isHeic(input)) {
    const { default: heic2any } = await import('heic2any')
    const out = await heic2any({ blob: input, toType: 'image/jpeg', quality: 0.9 })
    const blob = Array.isArray(out) ? out[0] : out
    file = new File([blob], input.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' })
  }

  // Los GIF animados se mantienen tal cual si no son enormes
  const keepOriginal = file.type === 'image/gif' && file.size < 8 * 1024 * 1024

  const full = keepOriginal
    ? file
    : await imageCompression(file, {
        maxWidthOrHeight: 2400,
        maxSizeMB: 1.5,
        initialQuality: 0.86,
        fileType: 'image/jpeg',
        useWebWorker: true,
      })

  const thumb = await imageCompression(file, {
    maxWidthOrHeight: 720,
    maxSizeMB: 0.2,
    initialQuality: 0.8,
    fileType: 'image/jpeg',
    useWebWorker: true,
  })

  const { width, height } = await dimensions(full)
  return { full, thumb, width, height, takenAt }
}
