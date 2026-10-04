export const MAX_IMAGE_SIZE = 15 * 1024 * 1024
export function validateImage(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Gunakan foto JPG, PNG, atau WebP.')
  if (file.size > MAX_IMAGE_SIZE) throw new Error('Foto maksimal 15 MB sebelum kompresi.')
  if (!file.size) throw new Error('File foto kosong.')
}
export async function compressImage(file: File): Promise<Blob> {
  validateImage(file)
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode().catch(() => { throw new Error('Foto tidak dapat dibaca. Pilih foto lain.') })
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(image.naturalWidth * scale)
    canvas.height = Math.round(image.naturalHeight * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Browser tidak mendukung kompresi foto.')
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      result => result ? resolve(result) : reject(new Error('Gagal mengompresi foto.')), 'image/jpeg', 0.8,
    ))
    if (blob.size > 5 * 1024 * 1024) throw new Error('Foto masih terlalu besar setelah kompresi. Pilih foto lebih kecil.')
    return blob
  } finally { URL.revokeObjectURL(url) }
}
