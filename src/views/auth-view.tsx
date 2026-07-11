'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAppStore } from '@/store/app-store';
import { Sparkles, ArrowRight, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

function LoginForm() {
  const { navigate } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('يرجى ملء جميع الحقول');
      return;
    }
    setIsLoading(true);
    try {
      const res = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
      });
      if (res?.error) {
        toast.error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      } else {
        window.location.href = '/';
      }
    } catch {
      toast.error('حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login-email">البريد الإلكتروني</Label>
        <div className="relative">
          <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="login-email"
            type="email"
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pr-10"
            dir="ltr"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="login-password">كلمة المرور</Label>
        <div className="relative">
          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pr-10 pl-10"
          />
          <button
            type="button"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <Button type="submit" className="w-full h-11 text-base font-bold" disabled={isLoading}>
        {isLoading ? (
          <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          'تسجيل الدخول'
        )}
      </Button>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          className="text-primary hover:underline"
          onClick={() => navigate('forgot-password')}
        >
          نسيت كلمة المرور؟
        </button>
        <span className="text-muted-foreground">
          ليس لديك حساب؟{' '}
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => navigate('signup')}
          >
            سجّل الآن
          </button>
        </span>
      </div>
    </form>
  );
}

function SignupForm() {
  const { navigate } = useAppStore();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim() || !email.trim() || !password.trim()) {
      toast.error('يرجى ملء جميع الحقول');
      return;
    }
    if (username.trim().length < 3) {
      toast.error('اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
      return;
    }
    if (password.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          username: username.trim().replace('@', ''),
          fullName: fullName.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'فشل في إنشاء الحساب');
      }
      toast.success('تم إنشاء الحساب بنجاح! جاري تسجيل الدخول...');
      const loginRes = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
      });
      if (loginRes?.error) {
        toast.error('تم إنشاء الحساب. يرجى تسجيل الدخول.');
        navigate('login');
      } else {
        window.location.href = '/';
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ أثناء التسجيل');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signup-name">الاسم الكامل</Label>
        <div className="relative">
          <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="signup-name"
            placeholder="أحمد محمد"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-username">اسم المستخدم</Label>
        <div className="relative">
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            @
          </span>
          <Input
            id="signup-username"
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="pr-9"
            dir="ltr"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-email">البريد الإلكتروني</Label>
        <div className="relative">
          <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="signup-email"
            type="email"
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pr-10"
            dir="ltr"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-password">كلمة المرور</Label>
        <div className="relative">
          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="signup-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pr-10 pl-10"
          />
          <button
            type="button"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <Button type="submit" className="w-full h-11 text-base font-bold" disabled={isLoading}>
        {isLoading ? (
          <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          'إنشاء حساب'
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        لديك حساب بالفعل؟{' '}
        <button
          type="button"
          className="text-primary hover:underline"
          onClick={() => navigate('login')}
        >
          سجّل الدخول
        </button>
      </p>
    </form>
  );
}

function ForgotPasswordForm() {
  const { goBack } = useAppStore();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('يرجى إدخال البريد الإلكتروني');
      return;
    }
    setIsLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      setSent(true);
      toast.success('تم إرسال رابط إعادة تعيين كلمة المرور (تجريبي)');
    } catch {
      toast.error('حدث خطأ');
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-bold">تم الإرسال!</h3>
        <p className="text-sm text-muted-foreground">
          تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني
        </p>
        <Button variant="outline" className="mt-4" onClick={goBack}>
          العودة لتسجيل الدخول
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="forgot-email">البريد الإلكتروني</Label>
        <div className="relative">
          <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="forgot-email"
            type="email"
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pr-10"
            dir="ltr"
          />
        </div>
      </div>

      <Button type="submit" className="w-full h-11 text-base font-bold" disabled={isLoading}>
        {isLoading ? (
          <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          'إرسال رابط إعادة التعيين'
        )}
      </Button>

      <button
        type="button"
        className="flex items-center gap-1 text-sm text-primary hover:underline mx-auto"
        onClick={goBack}
      >
        <ArrowRight className="h-4 w-4" />
        العودة لتسجيل الدخول
      </button>
    </form>
  );
}

export function AuthView() {
  const { currentView, navigate } = useAppStore();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">عدن تويتر</h1>
          <p className="text-muted-foreground mt-1">منصة التواصل الاجتماعي العربية</p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">
              {currentView === 'login' && 'تسجيل الدخول'}
              {currentView === 'signup' && 'إنشاء حساب جديد'}
              {currentView === 'forgot-password' && 'إعادة تعيين كلمة المرور'}
            </CardTitle>
            <CardDescription>
              {currentView === 'login' && 'أدخل بياناتك للمتابعة'}
              {currentView === 'signup' && 'انضم إلى مجتمع عدن تويتر'}
              {currentView === 'forgot-password' && 'أدخل بريدك الإلكتروني لإعادة التعيين'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentView === 'login' && <LoginForm />}
            {currentView === 'signup' && <SignupForm />}
            {currentView === 'forgot-password' && <ForgotPasswordForm />}
          </CardContent>
        </Card>

        {currentView === 'login' && (
          <div className="mt-6 p-4 rounded-2xl border border-border/50 bg-muted/30 text-center">
            <p className="text-sm text-muted-foreground">
              للتجربة: استخدم بيانات تسجيل الدخول المسجلة أو أنشئ حسابًا جديدًا
            </p>
            <Button
              variant="link"
              className="text-primary"
              onClick={() => navigate('signup')}
            >
              إنشاء حساب جديد
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}