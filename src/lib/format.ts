// Мелкие помощники для чисел и дат

export const rub = (n: number | null | undefined) =>
  n == null ? '—' : `${n.toLocaleString('ru-RU')} ₽`

export const km = (n: number | null | undefined) =>
  n == null ? '—' : `${n.toLocaleString('ru-RU')} км`

// «15 окт. 2026»
export const dateRu = (iso: string) =>
  new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })

// Пустая строка из поля ввода → null, иначе число
export const numOrNull = (s: string) => (s.trim() === '' ? null : Number(s))

// «Toyota Camry 2018» или «Без названия»
export function carTitle(i: { make: string | null; model: string | null; year: number | null; plate?: string | null }) {
  return [i.make, i.model, i.year].filter(Boolean).join(' ') || i.plate || 'Без названия'
}

// plural(5, ['фото', 'фото', 'фото'])
export function plural(n: number, forms: [string, string, string]): string {
  const n10 = n % 10, n100 = n % 100
  const form = n10 === 1 && n100 !== 11 ? forms[0] : n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14) ? forms[1] : forms[2]
  return `${n} ${form}`
}
