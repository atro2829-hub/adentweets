'use client';

import { useAuth } from '@/lib/auth-context';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/store/app-store';
import {
  ArrowRight,
  Moon,
  Sun,
  Bell,
  Lock,
  Trash2,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

export function SettingsView() {
  const { goBack } = useAppStore();
  const { session } = useAuth();
  const { theme, setTheme } = useTheme();
  const userId = session?.user?.id;

  const [isPrivate, setIsPrivate] = useState(false);
  const [notifLikes, setNotifLikes] = useState(true);
  const [notifRetweets, setNotifRetweets] = useState(true);
  const [notifFollows, setNotifFollows] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    async function fetchSettings() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/users/${userId}`);
        if (res.ok) {
          const data = await res.json();
          setIsPrivate(data.isPrivate || false);
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    }
    fetchSettings();
  }, [userId]);

  const togglePrivate = async (value: boolean) => {
    setIsPrivate(value);
    try {
      await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPrivate: value }),
      });
      toast.success(value ? 'تم تفعيل الحساب الخاص' : 'تم تعطيل الحساب الخاص');
    } catch {
      setIsPrivate(!value);
      toast.error('فشل في تحديث الإعدادات');
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-6 w-32" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={goBack}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">الإعدادات</h1>
      </div>

      <div className="divide-y divide-border/50">
        {/* Appearance */}
        <section className="p-4">
          <h2 className="text-base font-bold mb-3">المظهر</h2>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
              <div>
                <p className="text-sm font-medium">الوضع الداكن</p>
                <p className="text-xs text-muted-foreground">
                  {theme === 'dark' ? 'مفعّل' : 'معطّل'}
                </p>
              </div>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
          </div>
        </section>

        {/* Privacy */}
        <section className="p-4">
          <h2 className="text-base font-bold mb-3">الخصوصية</h2>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5" />
              <div>
                <p className="text-sm font-medium">حساب خاص</p>
                <p className="text-xs text-muted-foreground">
                  فقط المتابعون يمكنهم رؤية منشوراتك
                </p>
              </div>
            </div>
            <Switch checked={isPrivate} onCheckedChange={togglePrivate} />
          </div>
        </section>

        {/* Notification Settings */}
        <section className="p-4">
          <h2 className="text-base font-bold mb-3">إعدادات الإشعارات</h2>
          <div className="space-y-1">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">الإعجابات</p>
                <p className="text-xs text-muted-foreground">إشعار عند إعجاب شخص بمنشورك</p>
              </div>
              <Switch checked={notifLikes} onCheckedChange={setNotifLikes} />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">إعادة النشر</p>
                <p className="text-xs text-muted-foreground">
                  إشعار عند إعادة نشر شخص لتغريدتك
                </p>
              </div>
              <Switch checked={notifRetweets} onCheckedChange={setNotifRetweets} />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">المتابِعون الجدد</p>
                <p className="text-xs text-muted-foreground">
                  إشعار عند بدء شخص بمتابعتك
                </p>
              </div>
              <Switch checked={notifFollows} onCheckedChange={setNotifFollows} />
            </div>
          </div>
        </section>

        {/* Account */}
        <section className="p-4">
          <h2 className="text-base font-bold mb-3">الحساب</h2>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-12 text-rose-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl"
            onClick={() => toast.info('هذه الميزة غير متاحة في النسخة التجريبية')}
          >
            <Trash2 className="h-5 w-5" />
            <span>تعطيل الحساب</span>
          </Button>
        </section>

        {/* App Info */}
        <section className="p-4">
          <h2 className="text-base font-bold mb-3">معلومات التطبيق</h2>
          <div className="flex items-center gap-3 py-2">
            <Info className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm">عدن تويتر</p>
              <p className="text-xs text-muted-foreground">الإصدار 1.0.0</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}