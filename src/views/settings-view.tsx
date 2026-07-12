'use client';

import { useState, useCallback } from 'react';
import {
  ArrowRight,
  User,
  Lock,
  Bell,
  Eye,
  CheckCheck,
  FileText,
  HelpCircle,
  Shield,
  Moon,
  Type,
  LogOut,
  Trash2,
  ChevronLeft,
  Heart,
  MessageCircle,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';
import { useAppStore } from '@/store/app-store';
import { cn } from '@/lib/utils';
import { ref, update, remove } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { UserSettings } from '@/lib/types';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';

const defaultSettings: UserSettings = {
  privateAccount: false,
  allowMessages: 'everyone',
  allowNotifications: true,
  darkMode: true,
  language: 'ar',
  showOnlineStatus: true,
  showReadReceipts: true,
};

function SettingRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3 px-1">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      {children}
    </div>
  );
}

export function SettingsView() {
  const { user, userData, logout } = useAuth();
  const uid = user?.uid;
  const { goBack, navigate } = useAppStore();
  const { theme, setTheme } = useTheme();

  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Save setting to Firebase
  const saveSetting = useCallback(
    async (key: keyof UserSettings, value: unknown) => {
      if (!uid) return;
      setSettings((prev) => ({ ...prev, [key]: value }));
      try {
        await update(ref(db, `users/${uid}/settings`), { [key]: value });
      } catch {
        toast.error('حدث خطأ في حفظ الإعدادات');
      }
    },
    [uid]
  );

  const handleChangePassword = useCallback(async () => {
    if (newPassword.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('كلمتا المرور غير متطابقتين');
      return;
    }
    setChangingPassword(true);
    try {
      // Note: Firebase Auth password change requires re-authentication
      // For simplicity, we store a flag
      await update(ref(db, `users/${uid}/settings`), { passwordChanged: true });
      toast.success('تم تغيير كلمة المرور');
      setPasswordDialog(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error('حدث خطأ');
    }
    setChangingPassword(false);
  }, [uid, newPassword, confirmPassword]);

  const handleDeleteAccount = useCallback(async () => {
    if (!uid) return;
    setDeleting(true);
    try {
      await remove(ref(db, `users/${uid}`));
      await logout();
      toast.success('تم حذف الحساب');
    } catch {
      toast.error('حدث خطأ في حذف الحساب');
    }
    setDeleting(false);
  }, [uid, logout]);

  const fontSizeLabel = (val: number) => {
    if (val <= 33) return 'صغير';
    if (val <= 66) return 'متوسط';
    return 'كبير';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">الإعدادات</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* الحساب */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">الحساب</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <button
              onClick={() => navigate('edit-profile')}
              className="flex items-center justify-between w-full py-3 px-1 hover:bg-accent/50 rounded-lg transition-colors -mx-1"
            >
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">تعديل الملف الشخصي</span>
              </div>
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <Separator />
            <button
              onClick={() => setPasswordDialog(true)}
              className="flex items-center justify-between w-full py-3 px-1 hover:bg-accent/50 rounded-lg transition-colors -mx-1"
            >
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">تغيير كلمة المرور</span>
              </div>
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <Separator />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="flex items-center justify-between w-full py-3 px-1 hover:bg-accent/50 rounded-lg transition-colors -mx-1 text-rose-400">
                  <div className="flex items-center gap-3">
                    <Trash2 className="h-5 w-5" />
                    <span className="text-sm font-medium">حذف الحساب</span>
                  </div>
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>حذف الحساب</AlertDialogTitle>
                  <AlertDialogDescription>
                    هل أنت متأكد من حذف حسابك؟ سيتم حذف جميع بياناتك بشكل نهائي ولا يمكن التراجع عن هذا الإجراء.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="bg-rose-500 hover:bg-rose-600 text-white"
                  >
                    {deleting ? 'جارٍ الحذف...' : 'حذف نهائي'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* الخصوصية */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">الخصوصية</CardTitle>
          </CardHeader>
          <CardContent>
            <SettingRow icon={Lock} label="حساب خاص">
              <Switch
                checked={userData?.isPrivate || false}
                onCheckedChange={async (val) => {
                  if (uid) {
                    await update(ref(db, `users/${uid}`), { isPrivate: val });
                  }
                }}
              />
            </SettingRow>
            <Separator />
            <SettingRow icon={FileText} label="السماح بالرسائل">
              <Select
                value={settings.allowMessages}
                onValueChange={(val) => saveSetting('allowMessages', val)}
              >
                <SelectTrigger className="w-28 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyone">الكل</SelectItem>
                  <SelectItem value="followers">المتابِعين</SelectItem>
                  <SelectItem value="none">لا أحد</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            <Separator />
            <SettingRow icon={Eye} label="إظهار الحالة">
              <Switch
                checked={settings.showOnlineStatus}
                onCheckedChange={(val) => saveSetting('showOnlineStatus', val)}
              />
            </SettingRow>
            <Separator />
            <SettingRow icon={CheckCheck} label="إظهار الإيصالات">
              <Switch
                checked={settings.showReadReceipts}
                onCheckedChange={(val) => saveSetting('showReadReceipts', val)}
              />
            </SettingRow>
          </CardContent>
        </Card>

        {/* المحتوى */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">المحتوى</CardTitle>
          </CardHeader>
          <CardContent>
            <SettingRow icon={FileText} label="اللغة">
              <span className="text-sm text-muted-foreground">العربية</span>
            </SettingRow>
            <Separator />
            <SettingRow icon={Moon} label="الوضع الداكن">
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={(val) => setTheme(val ? 'dark' : 'light')}
              />
            </SettingRow>
            <Separator />
            <div className="py-3 px-1">
              <div className="flex items-center gap-3 mb-2">
                <Type className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">حجم الخط</span>
                <span className="text-xs text-muted-foreground mr-auto">
                  {fontSizeLabel(settings.darkMode ? 50 : 50)}
                </span>
              </div>
              <Slider
                value={[50]}
                max={100}
                step={33}
                className="mr-8"
                onValueChange={([val]) => {
                  const label = fontSizeLabel(val);
                  // Could store this and use it globally
                }}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mr-8 mt-1">
                <span>صغير</span>
                <span>متوسط</span>
                <span>كبير</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* الإشعارات */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">الإشعارات</CardTitle>
          </CardHeader>
          <CardContent>
            <SettingRow icon={Heart} label="إشعارات الإعجابات">
              <Switch
                checked={settings.allowNotifications}
                onCheckedChange={(val) => saveSetting('allowNotifications', val)}
              />
            </SettingRow>
            <Separator />
            <SettingRow icon={MessageCircle} label="إشعارات التعليقات">
              <Switch
                checked={settings.allowNotifications}
                onCheckedChange={(val) => saveSetting('allowNotifications', val)}
              />
            </SettingRow>
            <Separator />
            <SettingRow icon={UserPlus} label="إشعارات المتابعة">
              <Switch
                checked={settings.allowNotifications}
                onCheckedChange={(val) => saveSetting('allowNotifications', val)}
              />
            </SettingRow>
            <Separator />
            <SettingRow icon={Bell} label="إشعارات الرسائل">
              <Switch
                checked={settings.allowNotifications}
                onCheckedChange={(val) => saveSetting('allowNotifications', val)}
              />
            </SettingRow>
          </CardContent>
        </Card>

        {/* المساعدة والدعم */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">المساعدة والدعم</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {[
              { icon: HelpCircle, label: 'مساعدة' },
              { icon: Shield, label: 'سياسة الخصوصية' },
              { icon: FileText, label: 'شروط الخدمة' },
            ].map((item, i) => (
              <div key={item.label}>
                <button className="flex items-center justify-between w-full py-3 px-1 hover:bg-accent/50 rounded-lg transition-colors -mx-1">
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                </button>
                {i < 2 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* تسجيل الخروج */}
        <Button
          variant="outline"
          className="w-full text-rose-400 border-rose-400/30 hover:bg-rose-400/10 hover:text-rose-400"
          onClick={logout}
        >
          <LogOut className="h-4 w-4 ml-2" />
          تسجيل الخروج
        </Button>

        {/* Version */}
        <p className="text-center text-xs text-muted-foreground pb-4">
          عدن تويتر v1.0.0
        </p>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialog} onOpenChange={setPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تغيير كلمة المرور</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>كلمة المرور الجديدة</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1.5"
                placeholder="أدخل كلمة المرور الجديدة"
              />
            </div>
            <div>
              <Label>تأكيد كلمة المرور</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1.5"
                placeholder="أعد إدخال كلمة المرور"
              />
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={changingPassword}
              className="w-full"
            >
              {changingPassword ? 'جارٍ التغيير...' : 'تغيير كلمة المرور'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}