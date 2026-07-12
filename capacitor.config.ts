import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.adentweets.app',
  appName: 'AdenTweets',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#000000',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
  },
  android: {
    allowMixedContent: true,
  },
  icon: 'resources/icon-user-app.png',
};

export default config;