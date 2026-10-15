import type { PaintLevel } from '../lib/paint'
import { PAINT_LEVELS } from '../lib/paint'

// Расшифровка цветов схемы: что значит толщина краски
export default function PaintLegend() {
  return (
    <ul className="paint-legend">
      {(Object.keys(PAINT_LEVELS) as PaintLevel[]).map((k) => (
        <li key={k}>
          <i className={`swatch panel-${k}`} />
          <div><strong>{PAINT_LEVELS[k].label}</strong> <span className="muted">· {PAINT_LEVELS[k].range}</span>
            <div className="muted small">{PAINT_LEVELS[k].meaning}</div></div>
        </li>
      ))}
    </ul>
  )
}
