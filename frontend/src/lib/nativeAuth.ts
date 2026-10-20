import { Capacitor } from '@capacitor/core'

export const isNativeAuth = Capacitor.isNativePlatform()
export const nativeAuthClass = isNativeAuth ? ' auth-page--native' : ''
// Loaded with the auth entry point; keeps the root white after sign-in too.
if (typeof document !== 'undefined') {
  document.documentElement.classList.toggle('ledgernest-native', isNativeAuth)
}
