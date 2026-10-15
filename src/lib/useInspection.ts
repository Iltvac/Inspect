import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import type { Inspection } from './types'

export type SaveState = 'saved' | 'saving' | 'error'

// Загружает один осмотр и сохраняет правки сам, без кнопки «Сохранить»:
// изменения копятся и уходят в базу через полсекунды после последнего нажатия.
export function useInspection(id: string) {
  const [insp, setInsp] = useState<Inspection | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const pending = useRef<Partial<Inspection>>({})
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    supabase.from('inspections').select('*').eq('id', id).single().then(({ data, error }) => {
      if (error) setLoadError(error.code === 'PGRST116' ? 'Осмотр не найден' : error.message)
      else setInsp(data as Inspection)
    })
  }, [id])

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current)
    const changes = pending.current
    if (Object.keys(changes).length === 0) return
    pending.current = {}
    setSaveState('saving')
    const { error } = await supabase.from('inspections').update(changes).eq('id', id)
    if (error) {
      pending.current = { ...changes, ...pending.current } // попробуем ещё раз со следующей правкой
      setSaveState('error')
    } else if (Object.keys(pending.current).length === 0) setSaveState('saved')
  }, [id])

  // fn получает самое свежее состояние: важно, когда несколько фото догружаются одновременно
  const update = useCallback((fn: (i: Inspection) => Partial<Inspection>) => {
    setInsp((cur) => {
      if (!cur) return cur
      const changes = fn(cur)
      pending.current = { ...pending.current, ...changes }
      return { ...cur, ...changes }
    })
    setSaveState('saving')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void flush(), 600)
  }, [flush])

  // Уходим со страницы — дописываем несохранённое
  useEffect(() => () => { void flush() }, [flush])

  return { insp, loadError, saveState, update, flush }
}
