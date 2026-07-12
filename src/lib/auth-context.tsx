'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  type User,
} from 'firebase/auth';
import { ref, set, get, onValue, off } from 'firebase/database';
import { auth, db } from '@/lib/firebase';
import type { UserData } from '@/lib/types';
import { useAppStore } from '@/store/app-store';

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, username: string, fullName: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refresh: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const defaultUserData: UserData = {
  username: '',
  email: '',
  fullName: '',
  bio: '',
  avatarBase64: '',
  bannerBase64: '',
  followersCount: 0,
  followingCount: 0,
  postsCount: 0,
  isVerified: false,
  isPrivate: false,
  isSuspended: false,
  isAdmin: false,
  createdAt: Date.now(),
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { navigate, setCurrentUser } = useAppStore();

  const listenUserData = useCallback((uid: string) => {
    const userRef = ref(db, `users/${uid}`);
    onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const fullData: UserData = { ...defaultUserData, ...data };
        setUserData(fullData);
        setCurrentUser(fullData, uid);
      } else {
        setUserData(null);
        setCurrentUser(null, uid);
      }
    });
    return () => off(userRef);
  }, [setCurrentUser]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        listenUserData(firebaseUser.uid);
        if (userData === null) {
          // Don't auto-navigate to avoid overriding admin login
        }
      } else {
        setUserData(null);
        setCurrentUser(null, null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [listenUserData, navigate, setCurrentUser, userData]);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    navigate('home');
  };

  const signup = async (email: string, password: string, username: string, fullName: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: fullName });
    const newUser: UserData = {
      ...defaultUserData,
      username,
      email,
      fullName,
      createdAt: Date.now(),
    };
    await set(ref(db, `users/${cred.user.uid}`), newUser);
    navigate('home');
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const userRef = ref(db, `users/${cred.user.uid}`);
    const snapshot = await get(userRef);
    if (!snapshot.exists()) {
      const newUser: UserData = {
        ...defaultUserData,
        username: cred.user.displayName?.replace(/\s/g, '_') || 'user_' + cred.user.uid.slice(0, 6),
        email: cred.user.email || '',
        fullName: cred.user.displayName || '',
        createdAt: Date.now(),
      };
      await set(userRef, newUser);
    }
    navigate('home');
  };

  const logout = async () => {
    await signOut(auth);
    setUserData(null);
    setCurrentUser(null, null);
    navigate('auth');
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const refresh = useCallback(() => {
    // Auth state listener handles this
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, userData, isLoading, login, signup, loginWithGoogle, logout, resetPassword, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}