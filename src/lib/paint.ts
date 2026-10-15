// Детали кузова для замера толщины ЛКП и пороги оценки (в микронах).
import { plural } from './format'

export type Panel = { key: string; label: string; short: string }

// Порядок = обход машины по кругу: от капота по правому борту назад и по левому вперёд, крыша в конце.
// В этом порядке форма замера предлагает «следующую деталь».
export const PANELS: Panel[] = [
  { key: 'hood', label: 'Капот', short: 'Капот' },
  { key: 'fender_fr', label: 'Крыло переднее правое', short: 'Крыло' },
  { key: 'door_fr', label: 'Дверь передняя правая', short: 'Дверь' },
  { key: 'door_rr', label: 'Дверь задняя правая', short: 'Дверь' },
  { key: 'sill_r', label: 'Порог правый', short: 'Порог' },
  { key: 'quarter_rr', label: 'Крыло заднее правое', short: 'Крыло' },
  { key: 'trunk', label: 'Крышка багажника', short: 'Багажник' },
  { key: 'quarter_rl', label: 'Крыло заднее левое', short: 'Крыло' },
  { key: 'sill_l', label: 'Порог левый', short: 'Порог' },
  { key: 'door_rl', label: 'Дверь задняя левая', short: 'Дверь' },
  { key: 'door_fl', label: 'Дверь передняя левая', short: 'Дверь' },
  { key: 'fender_fl', label: 'Крыло переднее левое', short: 'Крыло' },
  { key: 'roof', label: 'Крыша', short: 'Крыша' },
]

export const PANEL_LABELS: Record<string, string> = Object.fromEntries(PANELS.map((p) => [p.key, p.label]))

export type PaintLevel = 'factory' | 'repaint' | 'putty'

// До 160 — заводская краска, до 300 — перекрас, больше — шпатлёвка.
export function paintLevel(microns: number): PaintLevel {
  if (microns <= 160) return 'factory'
  if (microns <= 300) return 'repaint'
  return 'putty'
}

export const PAINT_LEVELS: Record<PaintLevel, { label: string; range: string; meaning: string }> = {
  factory: { label: 'Заводская краска', range: 'до 160 мкм', meaning: 'Деталь не красили' },
  repaint: { label: 'Перекрас', range: '160–300 мкм', meaning: 'Деталь красили, возможно после мелкого ремонта' },
  putty: { label: 'Шпатлёвка', range: 'больше 300 мкм', meaning: 'Под краской шпатлёвка: деталь восстанавливали после удара' },
}

// Следующая деталь по кругу после current (или первая незамеренная, если current не задан)
export function nextPanel(paint: Record<string, number>, current?: string): Panel | null {
  const start = current ? PANELS.findIndex((p) => p.key === current) + 1 : 0
  for (let i = 0; i < PANELS.length; i++) {
    const p = PANELS[(start + i) % PANELS.length]
    if (p.key !== current && paint[p.key] == null) return p
  }
  return null
}

// Вывод словами: «Крашены: …. Шпатлёвка: …. Остальные детали в заводской краске.»
export function paintSummary(paint: Record<string, number>): string[] {
  const measured = PANELS.filter((p) => paint[p.key] != null)
  if (measured.length === 0) return []
  const list = (level: PaintLevel) => measured.filter((p) => paintLevel(paint[p.key]) === level)
    .map((p) => `${p.label.toLowerCase()} (${paint[p.key]})`)
  const repaint = list('repaint'), putty = list('putty'), factory = list('factory')
  const lines: string[] = []
  if (putty.length) lines.push(`Шпатлёвка: ${putty.join(', ')}.`)
  if (repaint.length) lines.push(`Перекрашены: ${repaint.join(', ')}.`)
  if (factory.length === measured.length) lines.push('Все замеренные детали в заводской краске.')
  else if (factory.length) lines.push(`Остальные ${plural(factory.length, ['деталь', 'детали', 'деталей'])} в заводской краске.`)
  const missing = PANELS.length - measured.length
  if (missing) lines.push(`Не замерено деталей: ${missing}.`)
  return lines
}

// Фото к детали (экран толщиномера или дефект) хранятся в общем списке фото с пометкой «paint.<деталь>»
export const paintPhotoItem = (panelKey: string) => `paint.${panelKey}`
export const panelOfPhoto = (item: string | null) => (item?.startsWith('paint.') ? item.slice(6) : null)

// Сколько фото прикреплено к каждой детали — для значка камеры на схеме
export function photoCounts(photos: { item: string | null }[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const p of photos) {
    const panel = panelOfPhoto(p.item)
    if (panel) counts[panel] = (counts[panel] ?? 0) + 1
  }
  return counts
}
