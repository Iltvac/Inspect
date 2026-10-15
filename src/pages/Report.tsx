import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Inspection } from '../lib/types'
import { STATUSES, VERDICTS } from '../lib/types'
import { CHECKLIST, ITEM_LABELS } from '../lib/checklist'
import type { PaintLevel } from '../lib/paint'
import { PANELS, paintLevel, paintPhotoItem, paintSummary, panelOfPhoto, photoCounts } from '../lib/paint'
import { photoUrl } from '../lib/photos'
import { carTitle, dateRu, km, rub } from '../lib/format'
import PaintDiagram from '../components/PaintDiagram'
import PaintLegend from '../components/PaintLegend'

type Report = Omit<Inspection, 'share_token'>

const levelStatus: Record<PaintLevel, string> = { factory: 'ok', repaint: 'warn', putty: 'bad' }

// Отчёт для клиента: открывается по ссылке без входа, только чтение.
export default function Report() {
  const { token = '' } = useParams()
  const [r, setR] = useState<Report | null | undefined>(undefined)
  const [photo, setPhoto] = useState<string | null>(null)

  useEffect(() => {
    supabase.rpc('get_report', { token }).then(({ data }) => setR((data as Report | null) ?? null))
  }, [token])

  useEffect(() => {
    if (r) document.title = `Отчёт: ${carTitle(r)}`
  }, [r])

  if (r === undefined) return <p className="center muted">Загрузка отчёта…</p>
  if (r === null) return <p className="center muted">Отчёт не найден. Возможно, ссылка устарела.</p>

  const facts: [string, string | null][] = [
    ['VIN', r.vin], ['Госномер', r.plate], ['Пробег', r.mileage != null ? km(r.mileage) : null],
    ['Цена продавца', r.price != null ? rub(r.price) : null], ['Где смотрели', r.location], ['Дата осмотра', dateRu(r.created_at)],
  ]
  const issues = CHECKLIST.flatMap((s) => s.items).filter((i) => r.checks[i.key]?.s === 'bad' || r.checks[i.key]?.s === 'warn')
    .sort((a, b) => (r.checks[a.key].s === 'bad' ? 0 : 1) - (r.checks[b.key].s === 'bad' ? 0 : 1))
  const measured = PANELS.filter((p) => r.paint[p.key] != null || r.photos.some((ph) => ph.item === paintPhotoItem(p.key)))
  const shownWithIssues = new Set(issues.map((i) => i.key))
  const generalPhotos = r.photos.filter((p) => !panelOfPhoto(p.item) && (!p.item || !shownWithIssues.has(p.item)))
  const panelsWithPhotos = PANELS.filter((p) => r.photos.some((ph) => ph.item === paintPhotoItem(p.key)))

  return (
    <div className="report">
      <header className="report-head">
        <span className="muted small">Отчёт об осмотре автомобиля{r.client_name && ` · клиент: ${r.client_name}`}</span>
        <h1>{carTitle(r)}</h1>
        <dl className="facts">
          {facts.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd className={k === 'VIN' ? 'mono' : ''}>{v}</dd></div>)}
        </dl>
        <button className="secondary no-print" onClick={() => window.print()}>Сохранить в PDF</button>
      </header>

      {r.verdict && (
        <section className={`verdict-banner v-${r.verdict}`}>
          <strong>{VERDICTS[r.verdict].label}</strong>
          <span>{VERDICTS[r.verdict].hint}</span>
        </section>
      )}
      {r.summary && <section className="card summary"><h3>Комментарий специалиста</h3><p>{r.summary}</p></section>}

      {issues.length > 0 && (
        <section>
          <h2>Что нашли</h2>
          <ul className="list">
            {issues.map((i) => {
              const c = r.checks[i.key]
              return (
                <li key={i.key} className={`card check status-${c.s}`}>
                  <div className="row"><strong>{ITEM_LABELS[i.key]}</strong><span className={`badge badge-${c.s}`}>{STATUSES[c.s!]}</span></div>
                  {c.n && <p>{c.n}</p>}
                  <Thumbs photos={r.photos.filter((p) => p.item === i.key).map((p) => p.path)} onOpen={setPhoto} />
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {measured.length > 0 && (
        <section>
          <h2>Толщина краски</h2>
          <div className="paint-layout">
            <PaintDiagram paint={r.paint} photos={photoCounts(r.photos)} />
            <div className="paint-side">
              <div className="card paint-summary">
                {paintSummary(r.paint).map((line) => <p key={line}>{line}</p>)}
              </div>
              <PaintLegend />
            </div>
          </div>
          {panelsWithPhotos.length > 0 && (
            <ul className="list paint-photo-list">
              {panelsWithPhotos.map((p) => {
                const v = r.paint[p.key]
                return (
                  <li key={p.key} className={`card check status-${v == null ? 'none' : levelStatus[paintLevel(v)]}`}>
                    <div className="row"><strong>{p.label}</strong>{v != null && <span className="nowrap">{v} мкм</span>}</div>
                    <Thumbs photos={r.photos.filter((ph) => ph.item === paintPhotoItem(p.key)).map((ph) => ph.path)} onOpen={setPhoto} />
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}

      <section>
        <h2>Полный чек-лист</h2>
        {CHECKLIST.map((sec) => {
          const items = sec.items.filter((i) => r.checks[i.key]?.s || r.checks[i.key]?.n)
          if (!items.length) return null
          return (
            <div key={sec.key} className="report-section">
              <h3>{sec.title}</h3>
              <ul className="check-table">
                {items.map((i) => {
                  const c = r.checks[i.key]
                  return (
                    <li key={i.key}>
                      <i className={`dot s-${c.s ?? 'none'}`} />
                      <span className="grow">{i.label}{c.n && <span className="muted"> — {c.n}</span>}</span>
                      <span className="small muted">{c.s ? STATUSES[c.s] : ''}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </section>

      {generalPhotos.length > 0 && (
        <section>
          <h2>Фото</h2>
          <div className="photo-grid">
            {generalPhotos.map((p) => (
              <button key={p.path} className="photo-open" onClick={() => setPhoto(p.path)}><img src={photoUrl(p.path)} alt="" loading="lazy" /></button>
            ))}
          </div>
        </section>
      )}

      <footer className="muted small report-foot">Отчёт обновлён {dateRu(r.updated_at)}</footer>

      {photo && (
        <div className="lightbox" onClick={() => setPhoto(null)}>
          <img src={photoUrl(photo)} alt="" />
        </div>
      )}
    </div>
  )
}

function Thumbs({ photos, onOpen }: { photos: string[]; onOpen: (p: string) => void }) {
  if (!photos.length) return null
  return (
    <div className="thumbs">
      {photos.map((p) => <button key={p} className="thumb" onClick={() => onOpen(p)}><img src={photoUrl(p)} alt="" loading="lazy" /></button>)}
    </div>
  )
}
