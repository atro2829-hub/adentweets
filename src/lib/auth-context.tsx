'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface SessionUser {
  id: string;
  name: string;
  email: string;
  username?: string;
  image?: string;
}

interface Session {
  user: SessionUser;
  expires: string;
}

let globalSession: Session | null = null;
let globalLoading = true;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((l) => l());
}

async function fetchSession(): Promise<Session | null> {
  try {
    const res = await fetch('/api/auth/session');
    if (!res.ok) return null;
    const data = await res.json();
    return data.user ? data : null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [session, setSessionState] = useState<Session | null>(globalSession);
  const [isLoading, setIsLoading] = useState(globalLoading);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    listeners.add(forceUpdate);

    // Fetch on mount
    let cancelled = false;
    fetchSession().then((data) => {
      if (cancelled || !mountedRef.current) return;
      globalSession = data;
      globalLoading = false;
      setSessionState(data);
      setIsLoading(false);
    });

    // Poll every 60s
    const interval = setInterval(async () => {
      const data = await fetchSession();
      if (!mountedRef.current) return;
      globalSession = data;
      globalLoading = false;
      setSessionState(data);
      setIsLoading(false);
    }, 60000);

    return () => {
      mountedRef.current = false;
      cancelled = true;
      clearInterval(interval);
      listeners.delete(forceUpdate);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const forceUpdate = useCallback(() => {
    setSessionState(globalSession);
    setIsLoading(globalLoading);
  }, []);

  const refresh = useCallback(async () => {
    const data = await fetchSession();
    globalSession = data;
    globalLoading = false;
    setSessionState(data);
    setIsLoading(false);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
    } catch {
      // ignore
    }
    globalSession = null;
    setSessionState(null);
  }, []);

  return { session, isLoading, refresh, logout };
}