'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/store/app-store';
import { ArrowRight, Camera } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileFormData {
  fullName: string;
  username: string;
  bio: string;
  location: string;
  website: string;
  profileImageUrl: string;
  bannerImageUrl: string;
  isPrivate: boolean;
}

export function EditProfileView() {
  const { goBack } = useAppStore();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [form, setForm] = useState<ProfileFormData>({
    fullName: '',
    username: '',
    bio: '',
    location: '',
    website: '',
    profileImageUrl: '',
    bannerImageUrl: '',
    isPrivate: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    async function fetchProfile() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/users/${userId}`);
        if (res.ok) {
          const data = await res.json();
          setForm({
            fullName: data.fullName || '',
            username: data.username || '',
            bio: data.bio || '',
            location: data.location || '',
            website: data.website || '',
            profileImageUrl: data.profileImageUrl || '',
            bannerImageUrl: data.bannerImageUrl || '',
            isPrivate: data.isPrivate || false,
          });
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    }
    fetchProfile();
  }, [userId]);

  const updateField = (field: keyof ProfileFormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.username.trim()) {
      toast.error('اسم المستخدم مطلوب');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'فشل في تحديث الملف');
      }
      toast.success('تم تحديث الملف الشخصي');
      goBack();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={goBack}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">تعديل الملف الشخصي</h1>
      </div>

      {/* Banner Preview */}
      <div className="relative rounded-2xl overflow-hidden mb-4">
        {form.bannerImageUrl ? (
          <img src={form.bannerImageUrl} alt="الغلاف" className="w-full h-32 object-cover" />
        ) : (
          <div className="w-full h-32 bg-muted flex items-center justify-center">
            <Camera className="h-8 w-8 text-muted-foreground/40" />
          </div>
        )}
      </div>

      {/* Profile Picture */}
      <div className="flex justify-center -mt-12 mb-6 relative z-10">
        <div className="relative">
          <Avatar className="h-24 w-24 border-4 border-background">
            <AvatarImage src={form.profileImageUrl} alt={form.fullName} />
            <AvatarFallback className="bg-primary/20 text-primary text-2xl">
              {form.fullName?.charAt(0) || 'م'}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4 max-w-lg mx-auto">
        <div className="space-y-2">
          <Label htmlFor="edit-name">الاسم الكامل</Label>
          <Input
            id="edit-name"
            value={form.fullName}
            onChange={(e) => updateField('fullName', e.target.value)}
            placeholder="أحمد محمد"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-username">اسم المستخدم</Label>
          <Input
            id="edit-username"
            value={form.username}
            onChange={(e) => updateField('username', e.target.value.replace('@', ''))}
            placeholder="username"
            dir="ltr"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-bio">النبذة التعريفية</Label>
          <Textarea
            id="edit-bio"
            value={form.bio}
            onChange={(e) => updateField('bio', e.target.value)}
            placeholder="اكتب نبذة عن نفسك..."
            className="min-h-[80px] resize-none"
            dir="rtl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-location">الموقع</Label>
          <Input
            id="edit-location"
            value={form.location}
            onChange={(e) => updateField('location', e.target.value)}
            placeholder="عدن، اليمن"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-website">الموقع الإلكتروني</Label>
          <Input
            id="edit-website"
            value={form.website}
            onChange={(e) => updateField('website', e.target.value)}
            placeholder="https://example.com"
            dir="ltr"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-avatar">رابط صورة الملف الشخصي</Label>
          <Input
            id="edit-avatar"
            value={form.profileImageUrl}
            onChange={(e) => updateField('profileImageUrl', e.target.value)}
            placeholder="https://example.com/avatar.jpg"
            dir="ltr"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-banner">رابط صورة الغلاف</Label>
          <Input
            id="edit-banner"
            value={form.bannerImageUrl}
            onChange={(e) => updateField('bannerImageUrl', e.target.value)}
            placeholder="https://example.com/banner.jpg"
            dir="ltr"
          />
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <Label>حساب خاص</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              فقط المتابعون يمكنهم رؤية منشوراتك
            </p>
          </div>
          <Switch
            checked={form.isPrivate}
            onCheckedChange={(checked) => updateField('isPrivate', checked)}
          />
        </div>

        <Button
          className="w-full rounded-full h-11 font-bold mt-4"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            'حفظ التغييرات'
          )}
        </Button>
      </div>
    </div>
  );
}