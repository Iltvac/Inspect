import { PANELS, paintLevel } from '../lib/paint'

// Схема кузова «развёрткой», как на бумажных бланках подборщиков:
// посередине вид сверху (капот, крыша, багажник), слева и справа — борта (крылья, двери, пороги).
// Нос машины смотрит вверх. onPick не передан — схема только для просмотра (отчёт).

type Shape = { key: string; cx: number; cy: number } & ({ d: string } | { x: number; y: number; w: number; h: number })

const SIDE_W = 64
const side = (x: number): Shape[] => {
  const left = x < 170
  const s = left ? 'l' : 'r'
  return [
    { key: `fender_f${s}`, x, y: 40, w: SIDE_W, h: 100, cx: x + SIDE_W / 2, cy: 90 },
    { key: `door_f${s}`, x, y: 146, w: SIDE_W, h: 104, cx: x + SIDE_W / 2, cy: 198 },
    { key: `door_r${s}`, x, y: 256, w: SIDE_W, h: 104, cx: x + SIDE_W / 2, cy: 308 },
    { key: `quarter_r${s}`, x, y: 366, w: SIDE_W, h: 104, cx: x + SIDE_W / 2, cy: 418 },
    { key: `sill_${s}`, x: left ? x + SIDE_W + 4 : x - 22, y: 146, w: 18, h: 214, cx: left ? x + SIDE_W + 13 : x - 13, cy: 253 },
  ]
}

const SHAPES: Shape[] = [
  { key: 'hood', d: 'M108 62 Q170 30 232 62 L234 166 L106 166 Z', cx: 170, cy: 110 },
  { key: 'roof', x: 110, y: 210, w: 120, h: 126, cx: 170, cy: 273 },
  { key: 'trunk', d: 'M108 380 L232 380 L232 448 Q170 482 108 448 Z', cx: 170, cy: 422 },
  ...side(8),
  ...side(268),
]

const SHORT: Record<string, string> = Object.fromEntries(PANELS.map((p) => [p.key, p.short]))

export default function PaintDiagram({ paint, onPick, selected, photos = {} }: {
  paint: Record<string, number>; onPick?: (key: string) => void; selected?: string | null
  photos?: Record<string, number> // число фото у детали → значок камеры
}) {
  return (
    <svg className="paint-diagram" viewBox="0 0 340 512" role="img" aria-label="Толщина краски по деталям">
      <text x="170" y="18" textAnchor="middle" className="car-caption">▲ ПЕРЕД</text>
      {/* стёкла — просто для узнаваемости */}
      <path d="M112 172 L228 172 L224 204 L116 204 Z" className="car-glass" />
      <path d="M116 342 L224 342 L228 374 L112 374 Z" className="car-glass" />

      {SHAPES.map((s) => {
        const v = paint[s.key]
        const level = v == null ? 'empty' : paintLevel(v)
        const sill = s.key.startsWith('sill')
        const cls = `panel panel-${level}${onPick ? ' clickable' : ''}${selected === s.key ? ' selected' : ''}`
        return (
          <g key={s.key} className={cls} onClick={onPick ? () => onPick(s.key) : undefined}
            role={onPick ? 'button' : undefined} aria-label={`${s.key}: ${v ?? 'не замерено'}`}>
            {'d' in s ? <path d={s.d} /> : <rect x={s.x} y={s.y} width={s.w} height={s.h} rx="9" />}
            {photos[s.key] > 0 && <PhotoBadge x={'d' in s ? s.cx + 46 : s.x + s.w - 4} y={'d' in s ? s.cy - 40 : s.y + 4} />}
            {sill ? (
              <text x={s.cx} y={s.cy} textAnchor="middle" dominantBaseline="central" className="panel-value small-value"
                transform={`rotate(-90 ${s.cx} ${s.cy})`}>
                {SHORT[s.key]} {v ?? (onPick ? '+' : '—')}
              </text>
            ) : (
              <>
                <text x={s.cx} y={s.cy - 14} textAnchor="middle" className="panel-name">{SHORT[s.key]}</text>
                <text x={s.cx} y={s.cy + 10} textAnchor="middle" className={`panel-value${v == null ? ' empty' : ''}`}>
                  {v ?? (onPick ? '+' : '—')}
                </text>
              </>
            )}
          </g>
        )
      })}

      <text x="40" y="496" textAnchor="middle" className="car-caption">Левый борт</text>
      <text x="170" y="496" textAnchor="middle" className="car-caption">Сверху</text>
      <text x="300" y="496" textAnchor="middle" className="car-caption">Правый борт</text>
    </svg>
  )
}

// Значок «есть фото» в углу детали
function PhotoBadge({ x, y }: { x: number; y: number }) {
  return (
    <g className="photo-badge" transform={`translate(${x - 18} ${y})`}>
      <rect width="18" height="14" rx="4" />
      <circle cx="9" cy="7.5" r="3.2" />
    </g>
  )
}
