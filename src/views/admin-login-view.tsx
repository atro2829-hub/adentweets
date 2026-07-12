'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { useAppStore } from '@/store/app-store';
import { toast } from 'sonner';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { get, ref } from 'firebase/database';
import { auth, db } from '@/lib/firebase';
import type { UserData } from '@/lib/types';

export function AdminLoginView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { navigate, setAdminMode } = useAppStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('أدخل البريد الإلكتروني وكلمة المرور');
      return;
    }
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const userSnap = await get(ref(db, `users/${cred.user.uid}`));
      if (!userSnap.exists() || !(userSnap.val() as UserData).isAdmin) {
        await signOut(auth);
        toast.error('ليس لديك صلاحيات المدير');
        setLoading(false);
        return;
      }
      setAdminMode(true);
      toast.success('مرحبًا بك في لوحة الإدارة');
      navigate('admin-dashboard');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        toast.error('بيانات الدخول غير صحيحة');
      } else if (code === 'auth/too-many-requests') {
        toast.error('محاولات كثيرة، حاول لاحقًا');
      } else {
        toast.error('حدث خطأ في تسجيل الدخول');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-background to-primary/5 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <Card className="w-full max-w-sm border-border/50">
          <CardHeader className="text-center pb-2 pt-8">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-xl font-bold">لوحة إدارة عدن تويتر</h1>
            <p className="text-sm text-muted-foreground mt-1">سجّل الدخول بحساب المدير</p>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label className="text-sm">البريد الإلكتروني</Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@adentweets.com"
                    className="pr-10"
                    dir="ltr"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm">كلمة المرور</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pr-10"
                    dir="ltr"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'تسجيل الدخول'
                )}
              </Button>
            </form>
            <button
              onClick={() => navigate('auth')}
              className="flex items-center gap-2 mx-auto mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowRight className="h-4 w-4" />
              العودة للتطبيق
            </button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}