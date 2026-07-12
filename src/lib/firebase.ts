import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
};

// Only initialize Firebase on client-side to prevent SSR/prerender failures
const isBrowser = typeof window !== 'undefined';

const app = isBrowser
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApp())
  : (null as unknown as ReturnType<typeof getApp>);

const auth = isBrowser
  ? getAuth(app)
  : (null as unknown as ReturnType<typeof getAuth>);

const db = isBrowser
  ? getDatabase(app)
  : (null as unknown as ReturnType<typeof getDatabase>);

export { app, auth, db };