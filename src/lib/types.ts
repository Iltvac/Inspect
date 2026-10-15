// Строка таблицы inspections (см. supabase/migrations/001_init.sql)

export type Status = 'ok' | 'warn' | 'bad'
export type Verdict = 'buy' | 'bargain' | 'reject'

export type Check = { s?: Status; n?: string }
export type Photo = { path: string; item: string | null }

export type Inspection = {
  id: string
  make: string | null
  model: string | null
  year: number | null
  vin: string | null
  plate: string | null
  mileage: number | null
  price: number | null
  location: string | null
  client_name: string | null
  checks: Record<string, Check>
  paint: Record<string, number>
  photos: Photo[]
  verdict: Verdict | null
  summary: string | null
  share_token: string
  created_at: string
  updated_at: string
}

export const VERDICTS: Record<Verdict, { label: string; hint: string }> = {
  buy: { label: 'Брать', hint: 'Машина в хорошем состоянии, цена адекватная' },
  bargain: { label: 'Торговаться', hint: 'Есть недостатки, на них можно сбить цену' },
  reject: { label: 'Не брать', hint: 'Серьёзные проблемы, лучше искать дальше' },
}

export const STATUSES: Record<Status, string> = { ok: 'В норме', warn: 'Замечание', bad: 'Плохо' }
