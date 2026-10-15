import type { CapacitorConfig } from '@capacitor/cli'

// Настройки Android-приложения. Код приложения тот же, что у сайта:
// Capacitor берёт собранную папку dist и упаковывает её в APK.
const config: CapacitorConfig = {
  appId: 'ru.carinspect.app',
  appName: 'Автоподбор',
  webDir: 'dist',
}

export default config
