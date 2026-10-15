import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Inspection } from '../lib/types'
import { VERDICTS } from '../lib/types'
import { carTitle, dateRu, km, plural, rub } from '../lib/format'
import { useToast } from '../components/Toast'

type Row = Pick<Inspection, 'id' | 'make' | 'model' | 'year' | 'vin' | 'plate' | 'mileage' | 'price' | 'client_name' | 'verdict' | 'photos' | 'created_at'>
const COLUMNS = 'id, make, model, year, vin, plate, mileage, price, client_name, verdict, photos, created_at'
const CACHE_KEY = 'inspect-cache:list'

function readCache(): Row[] | null {
  try { const raw = localStorage.getItem(CACHE_KEY); return raw ? (JSON.parse(raw) as Row[]) : null } catch { return null }
}

// Все осмотры: поиск по марке, VIN, номеру и клиенту; кнопка «Новый осмотр»
export default function List() {
  const [rows, setRows] = useState<Row[]>(() => readCache() ?? [])
  const [loading, setLoading] = useState(() => readCache() === null)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.from('inspections').select(COLUMNS).order('created_at', { ascending: false })
      if (error) toast(error.message, true)
      else {
        setRows(data as Row[])
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)) } catch { /* нет места — не страшно */ }
      }
      setLoading(false)
    }
    void load()
    // Изменения с другого устройства (осмотр на телефоне → список на ПК) приходят сами
    const channel = supabase.channel('inspections-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inspections' }, () => void load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [toast])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      [r.make, r.model, r.vin, r.plate, r.client_name, r.year].some((v) => String(v ?? '').toLowerCase().includes(q)))
  }, [rows, query])

  async function create() {
    setCreating(true)
    const { data, error } = await supabase.from('inspections').insert({}).select('id').single()
    setCreating(false)
    if (error) return toast(error.message, true)
    navigate(`/i/${data.id}`)
  }

  return (
    <>
      <div className="page-head">
        <h2>Осмотры</h2>
        <button onClick={create} disabled={creating}>+ Новый осмотр</button>
      </div>

      {rows.length > 0 && (
        <input className="search" type="search" placeholder="Марка, VIN, госномер или клиент"
          value={query} onChange={(e) => setQuery(e.target.value)} />
      )}

      {loading ? <p className="muted">Загрузка…</p> : rows.length === 0 ? (
        <div className="empty">
          <p>Осмотров пока нет.</p>
          <p className="small">Нажми «Новый осмотр», пройди чек-лист у машины и отправь клиенту ссылку на отчёт.</p>
        </div>
      ) : (
        <ul className="list">
          {filtered.map((r) => (
            <li key={r.id}>
              <Link to={`/i/${r.id}`} className={`card inspection verdict-border-${r.verdict ?? 'none'}`}>
                <div className="row">
                  <span className="order-title">{carTitle(r)}</span>
                  {r.verdict && <span className={`badge badge-${r.verdict}`}>{VERDICTS[r.verdict].label}</span>}
                </div>
                <div className="muted small">
                  {[r.plate, r.mileage != null && km(r.mileage), r.price != null && rub(r.price)].filter(Boolean).join(' · ') || 'Данные машины не заполнены'}
                </div>
                <div className="muted small">
                  {dateRu(r.created_at)}
                  {r.client_name && ` · клиент: ${r.client_name}`}
                  {r.photos.length > 0 && ` · ${plural(r.photos.length, ['фото', 'фото', 'фото'])}`}
                </div>
              </Link>
            </li>
          ))}
          {filtered.length === 0 && <p className="muted">Ничего не нашлось.</p>}
        </ul>
      )}
    </>
  )
}
