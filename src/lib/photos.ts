import { supabase } from './supabase'

const BUCKET = 'photos'

// Фото с телефона весят 3–8 МБ. Перед загрузкой уменьшаем до 1600 px по длинной стороне
// и пережимаем в JPEG: отчёт открывается быстро, а место в Supabase не кончается.
async function compress(file: File, maxSide = 1600, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Не удалось обработать фото'))), 'image/jpeg', quality),
  )
}

// Загружает фото в папку пользователя и возвращает путь в хранилище
export async function uploadPhoto(inspectionId: string, file: File): Promise<string> {
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error('Нужно войти заново')
  const blob = await compress(file)
  const path = `${data.user.id}/${inspectionId}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg' })
  if (error) throw error
  return path
}

export async function deletePhoto(path: string) {
  await supabase.storage.from(BUCKET).remove([path])
}

export function photoUrl(path: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}
