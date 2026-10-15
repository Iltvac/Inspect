// Ссылка на отчёт для клиента. В APK своего адреса у приложения нет,
// поэтому ссылка всегда ведёт на опубликованный сайт (VITE_PUBLIC_URL).
export function reportUrl(token: string): string {
  const base = import.meta.env.VITE_PUBLIC_URL || window.location.href.split('#')[0]
  return `${base.replace(/\/?$/, '/')}#/r/${token}`
}
