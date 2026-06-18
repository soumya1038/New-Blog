import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lekhon.app',
  appName: 'Lekhon',
  webDir: 'build',
  server: {
    androidScheme: 'https'
  }
};

export default config;
