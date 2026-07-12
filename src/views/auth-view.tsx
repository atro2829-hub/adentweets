'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useAppStore } from '@/store/app-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Mail, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const formVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const fieldVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

function getFirebaseErrorMessage(error: Error): string {
  const msg = error.message;
  if (msg.includes('invalid-credential') || msg.includes('wrong-password') || msg.includes('user-not-found'))
    return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
  if (msg.includes('too-many-requests'))
    return 'تم تجاوز عدد المحاولات. يرجى المحاولة لاحقًا';
  if (msg.includes('email-already-in-use'))
    return 'البريد الإلكتروني مستخدم بالفعل';
  if (msg.includes('weak-password'))
    return 'كلمة المرور ضعيفة جدًا';
  if (msg.includes('invalid-email'))
    return 'صيغة البريد الإلكتروني غير صحيحة';
  return 'حدث خطأ غير متوقع';
}

function getPasswordStrength(password: string): { level: number; label: string; color: string; width: string } {
  if (!password) return { level: 0, label: '', color: '', width: '0%' };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { level: 1, label: 'ضعيفة', color: 'bg-rose-500', width: '33%' };
  if (score <= 3) return { level: 2, label: 'متوسطة', color: 'bg-amber-500', width: '66%' };
  return { level: 3, label: 'قوية', color: 'bg-emerald-500', width: '100%' };
}

function LoginForm() {
  const { login, loginWithGoogle } = useAuth();
  const { navigate } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('يرجى ملء جميع الحقول');
      return;
    }
    setIsLoading(true);
    try {
      await login(email.trim(), password);
      toast.success('تم تسجيل الدخول بنجاح');
    } catch (err: unknown) {
      toast.error(getFirebaseErrorMessage(err instanceof Error ? err : new Error('')));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      toast.success('تم تسجيل الدخول بنجاح');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('popup-closed')) return;
      toast.error('حدث خطأ أثناء تسجيل الدخول بحساب Google');
    }
  };

  const handleResetPassword = async () => {
    if (!forgotEmail.trim()) {
      toast.error('يرجى إدخال بريدك الإلكتروني');
      return;
    }
    setIsForgotLoading(true);
    try {
      await resetPassword(forgotEmail.trim());
      toast.success('تم إرسال رابط إعادة تعيين كلمة المرور');
      setShowForgot(false);
      setForgotEmail('');
    } catch {
      toast.error('حدث خطأ. تأكد من صحة البريد الإلكتروني');
    } finally {
      setIsForgotLoading(false);
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-4"
      variants={formVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Email */}
      <motion.div className="space-y-2" variants={fieldVariants}>
        <label className="text-sm font-medium text-foreground">البريد الإلكتروني</label>
        <div className="relative">
          <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="email"
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 pr-10 rounded-xl bg-muted/50 border-border/50"
            dir="ltr"
          />
        </div>
      </motion.div>

      {/* Password */}
      <motion.div className="space-y-2" variants={fieldVariants}>
        <label className="text-sm font-medium text-foreground">كلمة المرور</label>
        <div className="relative">
          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 pr-10 pl-10 rounded-xl bg-muted/50 border-border/50"
          />
          <button
            type="button"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </motion.div>

      {/* Login button */}
      <motion.div variants={fieldVariants}>
        <Button
          type="submit"
          className="w-full h-12 text-base font-bold rounded-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            'تسجيل الدخول'
          )}
        </Button>
      </motion.div>

      {/* Divider */}
      <motion.div className="flex items-center gap-3" variants={fieldVariants}>
        <div className="flex-1 h-px bg-border/50" />
        <span className="text-sm text-muted-foreground">أو</span>
        <div className="flex-1 h-px bg-border/50" />
      </motion.div>

      {/* Google Login */}
      <motion.div variants={fieldVariants}>
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 text-base rounded-xl border-border/50 hover:bg-accent/50"
          onClick={handleGoogleLogin}
        >
          <svg className="h-5 w-5 ml-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          تسجيل الدخول بحساب Google
        </Button>
      </motion.div>

      {/* Forgot password */}
      <motion.div variants={fieldVariants}>
        <AnimatePresence mode="wait">
          {!showForgot ? (
            <motion.button
              key="forgot-link"
              type="button"
              className="text-sm text-sky-400 hover:text-sky-300 transition-colors w-full text-center"
              onClick={() => setShowForgot(true)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              نسيت كلمة المرور؟
            </motion.button>
          ) : (
            <motion.div
              key="forgot-form"
              className="space-y-2"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="بريدك الإلكتروني"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="h-10 pr-10 rounded-xl bg-muted/50 border-border/50 text-sm"
                  dir="ltr"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 rounded-full h-9 text-sm"
                  disabled={!forgotEmail.trim() || isForgotLoading}
                  onClick={handleResetPassword}
                >
                  {isForgotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'إرسال'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full h-9 text-sm"
                  onClick={() => setShowForgot(false)}
                >
                  إلغاء
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.form>
  );
}

function SignupForm() {
  const { signup } = useAuth();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

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
    if (/[^a-zA-Z0-9_]/.test(username.trim())) {
      toast.error('اسم المستخدم يجب أن يحتوي على أحرف إنجليزية وأرقام فقط');
      return;
    }
    if (password.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('كلمة المرور غير متطابقة');
      return;
    }
    setIsLoading(true);
    try {
      await signup(email.trim(), password, username.trim().replace('@', ''), fullName.trim());
      toast.success('تم إنشاء الحساب بنجاح!');
    } catch (err: unknown) {
      toast.error(getFirebaseErrorMessage(err instanceof Error ? err : new Error('')));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-4"
      variants={formVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Full name */}
      <motion.div className="space-y-2" variants={fieldVariants}>
        <label className="text-sm font-medium text-foreground">الاسم الكامل</label>
        <div className="relative">
          <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="أحمد محمد"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="h-12 pr-10 rounded-xl bg-muted/50 border-border/50"
          />
        </div>
      </motion.div>

      {/* Username */}
      <motion.div className="space-y-2" variants={fieldVariants}>
        <label className="text-sm font-medium text-foreground">اسم المستخدم</label>
        <div className="relative">
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
            @
          </span>
          <Input
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="h-12 pr-9 pl-3 rounded-xl bg-muted/50 border-border/50"
            dir="ltr"
          />
        </div>
      </motion.div>

      {/* Email */}
      <motion.div className="space-y-2" variants={fieldVariants}>
        <label className="text-sm font-medium text-foreground">البريد الإلكتروني</label>
        <div className="relative">
          <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="email"
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 pr-10 rounded-xl bg-muted/50 border-border/50"
            dir="ltr"
          />
        </div>
      </motion.div>

      {/* Password with strength */}
      <motion.div className="space-y-2" variants={fieldVariants}>
        <label className="text-sm font-medium text-foreground">كلمة المرور</label>
        <div className="relative">
          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 pr-10 pl-10 rounded-xl bg-muted/50 border-border/50"
          />
          <button
            type="button"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {/* Strength indicator */}
        <AnimatePresence>
          {password.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-1"
            >
              <div className="flex h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className={cn('h-full rounded-full transition-colors', strength.color)}
                  initial={{ width: 0 }}
                  animate={{ width: strength.width }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className={cn(
                'text-xs',
                strength.level === 1 ? 'text-rose-400' :
                strength.level === 2 ? 'text-amber-400' : 'text-emerald-400'
              )}>
                {strength.label}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Confirm password */}
      <motion.div className="space-y-2" variants={fieldVariants}>
        <label className="text-sm font-medium text-foreground">تأكيد كلمة المرور</label>
        <div className="relative">
          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-12 pr-10 rounded-xl bg-muted/50 border-border/50"
          />
        </div>
      </motion.div>

      {/* Submit */}
      <motion.div variants={fieldVariants}>
        <Button
          type="submit"
          className="w-full h-12 text-base font-bold rounded-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            'إنشاء حساب'
          )}
        </Button>
      </motion.div>
    </motion.form>
  );
}

export function AuthView() {
  const { navigate } = useAppStore();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative w-full max-w-md z-10">
        {/* Branding */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <motion.div
            className="inline-flex items-center justify-center mb-4"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' }}
          >
            <img
              src="/at-icon.png"
              alt="AdenTweets"
              className="h-16 w-16 rounded-2xl object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </motion.div>
          <h1 className="text-2xl font-bold">عدن تويتر</h1>
          <p className="text-muted-foreground mt-1 text-sm">انضم إلى المحادثة العربية</p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="border-border/50 shadow-2xl shadow-black/20 backdrop-blur-sm bg-background/80">
            <CardContent className="pt-6 pb-6">
              <Tabs defaultValue="login" dir="rtl">
                <TabsList className="w-full mb-5 h-11 rounded-xl bg-muted/50 p-1">
                  <TabsTrigger
                    value="login"
                    className="flex-1 h-9 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm font-medium transition-all"
                  >
                    تسجيل الدخول
                  </TabsTrigger>
                  <TabsTrigger
                    value="signup"
                    className="flex-1 h-9 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm font-medium transition-all"
                  >
                    إنشاء حساب
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="login">
                  <LoginForm />
                </TabsContent>
                <TabsContent value="signup">
                  <SignupForm />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>

        {/* Admin link */}
        <motion.div
          className="text-center mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => navigate('admin-login')}
          >
            لوحة الإدارة
          </button>
        </motion.div>
      </div>
    </div>
  );
}