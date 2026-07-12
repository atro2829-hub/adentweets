import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.adentweets.admin',
  appName: 'AdenTweets Admin',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#0f172a',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
  },
  android: {
    allowMixedContent: true,
  },
  icon: 'resources/icon-admin-app.png',
};

export default config;