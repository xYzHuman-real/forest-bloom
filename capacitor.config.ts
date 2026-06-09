import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.treerise',
  appName: 'TreeRise',
  webDir: 'dist',
  server: {
    // Point the APK at your live Lovable preview so you don't need a static build.
    // After you publish, swap this to your published URL (e.g. https://treerise.lovable.app).
    url: 'https://id-preview--ef36cee4-0339-40dc-9cae-c353b4d4c887.lovable.app',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#F7FBF4',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#7BC47F',
    },
  },
};

export default config;
