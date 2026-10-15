import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useInspection } from '../lib/useInspection'
import type { Inspection, Status } from '../lib/types'
import { STATUSES, VERDICTS } from '../lib/types'
import { CHECKLIST, ITEM_LABELS } from '../lib/checklist'
import { PAINT_LEVELS, PANEL_LABELS, PANELS, nextPanel, paintLevel, paintPhotoItem, paintSummary, panelOfPhoto, photoCounts } from '../lib/paint'
import PaintLegend from '../components/PaintLegend'
import { deletePhoto, photoUrl, uploadPhoto } from '../lib/photos'
import { carTitle, numOrNull } from '../lib/format'
import { reportUrl } from '../lib/share'
import Field from '../components/Field'
import PaintDiagram from '../components/PaintDiagram'
import Sheet from '../components/Sheet'
import { IconBack, IconCamera } from '../components/Icons'
import { useToast } from '../components/Toast'

const TABS = [
  { key: 'car', label: 'Машина' },
  { key: 'paint', label: 'Краска' },
  { key: 'checks', label: 'Проверка' },
  { key: 'photos', label: 'Фото' },
  { key: 'result', label: 'Итог' },
] as const
type Tab = (typeof TABS)[number]['key']

type Update = (fn: (i: Inspection) => Partial<Inspection>) => void

export default function Editor() {
  const { id = '' } = useParams()
  const { insp, loadError, saveState, update, flush } = useInspection(id)
  const [tab, setTab] = useState<Tab>('car')
  const [uploading, setUploading] = useState(0)
  const fileInput = useRef<HTMLInputElement>(null) // галерея, можно несколько
  const cameraInput = useRef<HTMLInputElement>(null) // сразу камера
  const photoTarget = useRef<string | null>(null) // к какому пункту чек-листа относится фото
  const toast = useToast()

  if (loadError) return <div className="empty"><p>{loadError}</p><Link to="/" className="btn secondary">К списку</Link></div>
  if (!insp) return <p className="muted">Загрузка…</p>

  function addPhotos(item: string | null, camera = false) {
    photoTarget.current = item
    ;(camera ? cameraInput : fileInput).current?.click()
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return
    const item = photoTarget.current
    const list = Array.from(files)
    setUploading((n) => n + list.length)
    await Promise.all(list.map(async (file) => {
      try {
        const path = await uploadPhoto(id, file)
        update((cur) => ({ photos: [...cur.photos, { path, item }] }))
      } catch (e) {
        toast(`Фото не загрузилось: ${e instanceof Error ? e.message : e}`, true)
      } finally {
        setUploading((n) => n - 1)
      }
    }))
    if (fileInput.current) fileInput.current.value = ''
    if (cameraInput.current) cameraInput.current.value = ''
  }

  function removePhoto(path: string) {
    if (!confirm('Удалить фото?')) return
    update((cur) => ({ photos: cur.photos.filter((p) => p.path !== path) }))
    void deletePhoto(path)
  }

  return (
    <>
      <div className="page-head editor-head">
        <Link to="/" className="icon-btn" aria-label="К списку" onClick={() => void flush()}><IconBack /></Link>
        <h2 className="grow ellipsis">{carTitle(insp)}</h2>
        <span className={`save-state ${saveState}`}>
          {uploading > 0 ? `Загружаю фото: ${uploading}` : saveState === 'saving' ? 'Сохраняю…' : saveState === 'error' ? 'Нет связи, повторю' : 'Сохранено'}
        </span>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? 'on' : ''} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => void onFiles(e.target.files)} />
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void onFiles(e.target.files)} />

      {tab === 'car' && <CarTab insp={insp} update={update} />}
      {tab === 'paint' && <PaintTab insp={insp} update={update} onPhoto={addPhotos} onRemovePhoto={removePhoto} />}
      {tab === 'checks' && <ChecksTab insp={insp} update={update} onPhoto={(item) => addPhotos(item, true)} onRemovePhoto={removePhoto} />}
      {tab === 'photos' && <PhotosTab insp={insp} onAdd={(camera) => addPhotos(null, camera)} onRemove={removePhoto} />}
      {tab === 'result' && <ResultTab insp={insp} update={update} flush={flush} />}

      {tab !== 'result' && (
        <button className="secondary next-tab" onClick={() => { setTab(TABS[TABS.findIndex((t) => t.key === tab) + 1].key); window.scrollTo(0, 0) }}>
          Дальше: {TABS[TABS.findIndex((t) => t.key === tab) + 1].label}
        </button>
      )}
    </>
  )
}

// --- Машина ---

function CarTab({ insp, update }: { insp: Inspection; update: Update }) {
  const text = (key: keyof Inspection, upper = false) => ({
    value: (insp[key] as string | null) ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = upper ? e.target.value.toUpperCase() : e.target.value
      update(() => ({ [key]: v.trim() === '' ? null : v }))
    },
  })
  const num = (key: keyof Inspection) => ({
    value: (insp[key] as number | null) ?? '',
    inputMode: 'numeric' as const,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => update(() => ({ [key]: numOrNull(e.target.value.replace(/\s/g, '')) })),
  })

  return (
    <div className="form">
      <div className="grid-2">
        <Field label="Марка"><input {...text('make')} placeholder="Toyota" /></Field>
        <Field label="Модель"><input {...text('model')} placeholder="Camry" /></Field>
      </div>
      <div className="grid-2">
        <Field label="Год"><input type="number" {...num('year')} placeholder="2018" /></Field>
        <Field label="Госномер"><input {...text('plate', true)} placeholder="А123ВС77" /></Field>
      </div>
      <Field label="VIN"><input {...text('vin', true)} maxLength={17} placeholder="17 символов" className="mono" /></Field>
      <div className="grid-2">
        <Field label="Пробег, км"><input type="number" {...num('mileage')} /></Field>
        <Field label="Цена продавца, ₽"><input type="number" {...num('price')} /></Field>
      </div>
      <Field label="Где смотрели"><input {...text('location')} placeholder="Город, адрес или площадка" /></Field>
      <Field label="Для кого подбор" hint="Имя клиента, видно в отчёте"><input {...text('client_name')} /></Field>
    </div>
  )
}

// --- Краска ---

type PhotoActions = { onPhoto: (item: string, camera: boolean) => void; onRemovePhoto: (path: string) => void }

function PaintTab({ insp, update, onPhoto, onRemovePhoto }: { insp: Inspection; update: Update } & PhotoActions) {
  const [editing, setEditing] = useState<string | null>(null)
  const measured = PANELS.filter((p) => insp.paint[p.key] != null).length
  const summary = paintSummary(insp.paint)
  const next = nextPanel(insp.paint)

  function save(key: string, value: number | null) {
    update((cur) => {
      const paint = { ...cur.paint }
      if (value == null) delete paint[key]
      else paint[key] = value
      return { paint }
    })
  }

  return (
    <div className="paint-tab">
      <div className="card paint-start">
        <div>
          <strong>Замерено {measured} из {PANELS.length}</strong>
          <p className="muted small">{next ? 'Обойди машину с толщиномером: приложение само подскажет, какую деталь мерить следующей.' : 'Все детали замерены. Чтобы поправить число, нажми на деталь.'}</p>
        </div>
        {next && <button onClick={() => setEditing(next.key)}>{measured ? 'Продолжить обход' : 'Начать обход'}</button>}
      </div>

      <div className="paint-layout">
        <div>
          <PaintDiagram paint={insp.paint} onPick={setEditing} selected={editing} photos={photoCounts(insp.photos)} />
          <p className="muted small center-text">Нажми на деталь, чтобы вписать или поправить замер</p>
        </div>
        <div className="paint-side">
          {summary.length > 0 && (
            <div className="card paint-summary">
              <h3>Что видно по краске</h3>
              {summary.map((line) => <p key={line}>{line}</p>)}
            </div>
          )}
          <PaintLegend />
        </div>
      </div>

      {editing && (
        <PaintSheet key={editing} panelKey={editing} paint={insp.paint}
          photos={insp.photos.filter((p) => p.item === paintPhotoItem(editing)).map((p) => p.path)}
          onPhoto={onPhoto} onRemovePhoto={onRemovePhoto}
          onSave={save} onGo={setEditing} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}

// Окно замера одной детали: большое поле, подсказка «что значит это число» и переход к следующей детали.
function PaintSheet({ panelKey, paint, photos, onPhoto, onRemovePhoto, onSave, onGo, onClose }: {
  panelKey: string; paint: Record<string, number>; photos: string[]
  onSave: (key: string, v: number | null) => void; onGo: (key: string) => void; onClose: () => void
} & PhotoActions) {
  const [draft, setDraft] = useState(paint[panelKey] != null ? String(paint[panelKey]) : '')
  const value = draft.trim() === '' ? null : Number(draft)
  const valid = value != null && Number.isFinite(value) && value > 0 && value < 5000
  const after = { ...paint, [panelKey]: valid ? value : paint[panelKey] }
  const next = nextPanel(after, panelKey)
  const index = PANELS.findIndex((p) => p.key === panelKey) + 1

  function saveAndNext() {
    if (!valid) return
    onSave(panelKey, value)
    if (next) onGo(next.key)
    else onClose()
  }

  return (
    <Sheet title={PANEL_LABELS[panelKey]} onClose={onClose}>
      <form className="form" onSubmit={(e) => { e.preventDefault(); saveAndNext() }}>
        <div className="sheet-where">
          <PaintDiagram paint={paint} selected={panelKey} />
          <p className="muted small">Деталь {index} из {PANELS.length} по кругу (обведена на схеме). Замерь в 2–3 местах и впиши самое большое число.</p>
        </div>
        <div className="microns-input">
          <input type="number" inputMode="numeric" autoFocus value={draft} placeholder="0"
            onChange={(e) => setDraft(e.target.value)} aria-label="Толщина в микронах" />
          <span>мкм</span>
        </div>
        {valid ? (
          <div className={`level-hint level-${paintLevel(value)}`}>
            <strong>{PAINT_LEVELS[paintLevel(value)].label}</strong>
            <span>{PAINT_LEVELS[paintLevel(value)].meaning}</span>
          </div>
        ) : <div className="level-hint">Впиши число с толщиномера</div>}
        <div className="paint-photos">
          <span className="field-label">Фото толщиномера или дефекта</span>
          <div className="thumbs">
            {photos.map((p) => (
              <button type="button" key={p} className="thumb" onClick={() => onRemovePhoto(p)} aria-label="Удалить фото">
                <img src={photoUrl(p)} alt="" loading="lazy" />
              </button>
            ))}
            <button type="button" className="thumb thumb-add" onClick={() => onPhoto(paintPhotoItem(panelKey), true)} aria-label="Снять фото">
              <IconCamera /><span>Снять</span>
            </button>
            <button type="button" className="thumb thumb-add" onClick={() => onPhoto(paintPhotoItem(panelKey), false)} aria-label="Фото из галереи">
              <span className="plus">+</span><span>Галерея</span>
            </button>
          </div>
          <span className="field-hint">Клиент увидит фото в отчёте рядом с этой деталью</span>
        </div>
        <button type="submit" disabled={!valid}>{next ? `Сохранить → ${next.label}` : 'Сохранить, это последняя'}</button>
        <div className="grid-2">
          <button type="button" className="secondary" disabled={!valid} onClick={() => { onSave(panelKey, value); onClose() }}>Сохранить и закрыть</button>
          {paint[panelKey] != null
            ? <button type="button" className="secondary danger-link" onClick={() => { onSave(panelKey, null); onClose() }}>Убрать замер</button>
            : <button type="button" className="secondary" onClick={() => (next ? onGo(next.key) : onClose())}>Пропустить</button>}
        </div>
      </form>
    </Sheet>
  )
}

// --- Проверка ---

function ChecksTab({ insp, update, onPhoto, onRemovePhoto }: {
  insp: Inspection; update: Update; onPhoto: (item: string) => void; onRemovePhoto: (path: string) => void
}) {
  function setCheck(key: string, change: { s?: Status; n?: string }) {
    update((cur) => {
      const prev = cur.checks[key] ?? {}
      const next = { ...prev, ...change }
      if (change.s && prev.s === change.s) delete next.s // повторное нажатие снимает отметку
      if (next.n === '') delete next.n
      const checks = { ...cur.checks }
      if (next.s || next.n) checks[key] = next
      else delete checks[key]
      return { checks }
    })
  }

  return (
    <div className="checklist">
      {CHECKLIST.map((sec) => {
        const done = sec.items.filter((i) => insp.checks[i.key]?.s).length
        return (
          <section key={sec.key}>
            <h3 className="row">{sec.title}<span className="muted small">{done} из {sec.items.length}</span></h3>
            <ul className="list">
              {sec.items.map((item) => {
                const c = insp.checks[item.key] ?? {}
                const photos = insp.photos.filter((p) => p.item === item.key)
                return (
                  <li key={item.key} className={`card check status-${c.s ?? 'none'}`}>
                    <div className="check-label">
                      <strong>{item.label}</strong>
                      {item.hint && <span className="muted small">{item.hint}</span>}
                    </div>
                    <div className="check-actions">
                      {(Object.keys(STATUSES) as Status[]).map((s) => (
                        <button key={s} className={`status-btn s-${s}${c.s === s ? ' on' : ''}`} onClick={() => setCheck(item.key, { s })}>
                          {STATUSES[s]}
                        </button>
                      ))}
                      <button className="icon-btn" onClick={() => onPhoto(item.key)} aria-label="Добавить фото"><IconCamera /></button>
                    </div>
                    {(c.s === 'warn' || c.s === 'bad' || c.n) && (
                      <input className="note" placeholder="Что не так? Это увидит клиент" value={c.n ?? ''}
                        onChange={(e) => setCheck(item.key, { n: e.target.value })} />
                    )}
                    {photos.length > 0 && (
                      <div className="thumbs">
                        {photos.map((p) => (
                          <button key={p.path} className="thumb" onClick={() => onRemovePhoto(p.path)} aria-label="Удалить фото">
                            <img src={photoUrl(p.path)} alt="" loading="lazy" />
                          </button>
                        ))}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

// --- Фото ---

function PhotosTab({ insp, onAdd, onRemove }: { insp: Inspection; onAdd: (camera: boolean) => void; onRemove: (path: string) => void }) {
  return (
    <>
      <div className="grid-2">
        <button onClick={() => onAdd(true)}><IconCamera /> Снять</button>
        <button className="secondary" onClick={() => onAdd(false)}>Из галереи</button>
      </div>
      <p className="muted small">Общие фото машины. Фото к конкретному пункту удобнее добавлять кнопкой с камерой на вкладке «Проверка».</p>
      {insp.photos.length === 0 ? <div className="empty">Фото пока нет</div> : (
        <div className="photo-grid">
          {insp.photos.map((p) => (
            <figure key={p.path}>
              <a href={photoUrl(p.path)} target="_blank" rel="noreferrer"><img src={photoUrl(p.path)} alt="" loading="lazy" /></a>
              <figcaption>
                <span className="small muted">{photoCaption(p.item)}</span>
                <button className="link danger-link" onClick={() => onRemove(p.path)}>Удалить</button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </>
  )
}

// --- Итог ---

function ResultTab({ insp, update, flush }: { insp: Inspection; update: Update; flush: () => Promise<void> }) {
  const navigate = useNavigate()
  const toast = useToast()
  const checks = Object.values(insp.checks)
  const bad = checks.filter((c) => c.s === 'bad').length
  const warn = checks.filter((c) => c.s === 'warn').length
  const total = CHECKLIST.reduce((n, s) => n + s.items.length, 0)
  const url = reportUrl(insp.share_token)
  const shareText = `Отчёт об осмотре: ${carTitle(insp)}`

  async function copy() {
    await flush()
    try { await navigator.clipboard.writeText(url); toast('Ссылка скопирована') }
    catch { prompt('Скопируй ссылку', url) }
  }

  // Новый случайный код: отчёт по старой ссылке больше не откроется
  async function changeLink() {
    if (!confirm('Сделать новую ссылку? Старая перестанет открываться, клиенту нужно будет отправить новую.')) return
    const bytes = crypto.getRandomValues(new Uint8Array(12))
    const token = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    await flush()
    const { error } = await supabase.from('inspections').update({ share_token: token }).eq('id', insp.id)
    if (error) return toast(error.message, true)
    update(() => ({ share_token: token }))
    toast('Ссылка обновлена')
  }

  async function remove() {
    if (!confirm('Удалить осмотр вместе с фото? Ссылка на отчёт перестанет работать.')) return
    if (insp.photos.length) await supabase.storage.from('photos').remove(insp.photos.map((p) => p.path))
    const { error } = await supabase.from('inspections').delete().eq('id', insp.id)
    if (error) return toast(error.message, true)
    navigate('/')
  }

  return (
    <div className="form">
      <div className="stats">
        <div className="card stat"><span className="muted small">Проверено</span><strong>{checks.filter((c) => c.s).length} из {total}</strong></div>
        <div className="card stat"><span className="muted small">Замечаний</span><strong className="warn">{warn}</strong></div>
        <div className="card stat"><span className="muted small">Плохо</span><strong className="error">{bad}</strong></div>
        <div className="card stat"><span className="muted small">Фото</span><strong>{insp.photos.length}</strong></div>
      </div>

      <fieldset>
        <legend>Вывод</legend>
        <div className="verdicts">
          {(Object.keys(VERDICTS) as (keyof typeof VERDICTS)[]).map((v) => (
            <button key={v} className={`verdict-btn v-${v}${insp.verdict === v ? ' on' : ''}`}
              onClick={() => update((cur) => ({ verdict: cur.verdict === v ? null : v }))}>
              <strong>{VERDICTS[v].label}</strong>
              <span className="small">{VERDICTS[v].hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <Field label="Комментарий для клиента" hint="Главное своими словами: что понравилось, что смущает, за сколько стоит брать">
        <textarea rows={5} value={insp.summary ?? ''} onChange={(e) => update(() => ({ summary: e.target.value || null }))} />
      </Field>

      <fieldset>
        <legend>Отправить клиенту</legend>
        <p className="small muted">Клиент откроет отчёт по ссылке без регистрации. Правки после отправки он увидит сразу.</p>
        <div className="share-row">
          <button onClick={() => void copy()}>Скопировать ссылку</button>
          <a className="btn secondary" href={`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${url}`)}`} target="_blank" rel="noreferrer" onClick={() => void flush()}>WhatsApp</a>
          <a className="btn secondary" href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer" onClick={() => void flush()}>Telegram</a>
        </div>
        <Link to={`/r/${insp.share_token}`} className="btn secondary wide" onClick={() => void flush()}>Посмотреть отчёт как клиент</Link>
        <button className="link" onClick={() => void changeLink()}>Сменить ссылку (старая перестанет открываться)</button>
      </fieldset>

      <button className="link danger-link" onClick={() => void remove()}>Удалить осмотр</button>
    </div>
  )
}

function photoCaption(item: string | null): string {
  if (!item) return 'Общее'
  const panel = panelOfPhoto(item)
  return panel ? `Краска: ${PANEL_LABELS[panel]}` : ITEM_LABELS[item] ?? ''
}

