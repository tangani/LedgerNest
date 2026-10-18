import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.tangani.ledgernest',
  appName: 'LedgerNest',
  webDir: 'dist',
  server: {
    hostname: 'localhost',
    androidScheme: 'https',
  },
}

export default config