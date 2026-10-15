import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

// Короткое сообщение внизу экрана: «Заказ добавлен», «Ошибка: …»
type Toast = { text: string; error?: boolean }
const ToastContext = createContext<(text: string, error?: boolean) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)

  const show = useCallback((text: string, error = false) => {
    setToast({ text, error })
    window.setTimeout(() => setToast((t) => (t?.text === text ? null : t)), error ? 5000 : 2500)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && <div className={`toast${toast.error ? ' toast-error' : ''}`} onClick={() => setToast(null)}>{toast.text}</div>}
    </ToastContext.Provider>
  )
}

// oxlint-disable-next-line react/only-export-components
export const useToast = () => useContext(ToastContext)
