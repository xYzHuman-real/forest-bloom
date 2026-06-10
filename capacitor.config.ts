import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.treerise.app',
  appName: 'TreeRise',
  webDir: 'dist',
  server: {
    // Points the APK at the live Lovable preview so updates ship instantly.
    // Swap to your published URL after release: https://treerise.lovable.app
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
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#2E7D32',
    },
  },
};

export default config;
