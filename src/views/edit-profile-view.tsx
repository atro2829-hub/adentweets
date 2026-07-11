'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/store/app-store';
import { ArrowRight, Camera, X } from 'lucide-react';
import { toast } from 'sonner';
import { ref, update } from 'firebase/database';
import { db } from '@/lib/firebase';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export function EditProfileView() {
  const { goBack } = useAppStore();
  const { user, userData } = useAuth();
  const userId = user?.uid;

  const [fullName, setFullName] = useState(userData?.fullName || '');
  const [username, setUsername] = useState(userData?.username || '');
  const [bio, setBio] = useState(userData?.bio || '');
  const [avatarBase64, setAvatarBase64] = useState(userData?.avatarBase64 || '');
  const [bannerBase64, setBannerBase64] = useState(userData?.bannerBase64 || '');
  const [isSaving, setIsSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'avatar' | 'banner'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || '';
      if (field === 'avatar') {
        setAvatarBase64(base64);
      } else {
        setBannerBase64(base64);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!userId) return;
    if (!username.trim()) {
      toast.error('اسم المستخدم مطلوب');
      return;
    }

    setIsSaving(true);
    try {
      await update(ref(db, `users/${userId}`), {
        fullName: fullName.trim(),
        username: username.trim(),
        bio: bio.trim(),
        avatarBase64,
        bannerBase64,
      });
      toast.success('تم تحديث الملف الشخصي');
      goBack();
    } catch {
      toast.error('حدث خطأ أثناء التحديث');
    } finally {
      setIsSaving(false);
    }
  };

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
        {bannerBase64 ? (
          <img
            src={`data:image/jpeg;base64,${bannerBase64}`}
            alt="الغلاف"
            className="w-full h-32 object-cover"
          />
        ) : (
          <div className="w-full h-32 bg-gradient-to-br from-rose-900/40 via-background to-amber-900/30 flex items-center justify-center">
            <Camera className="h-8 w-8 text-muted-foreground/40" />
          </div>
        )}
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleImageChange(e, 'banner')}
        />
        <Button
          variant="secondary"
          size="icon"
          className="absolute bottom-2 left-2 h-8 w-8 rounded-full bg-black/60 hover:bg-black/80"
          onClick={() => bannerInputRef.current?.click()}
        >
          <Camera className="h-4 w-4" />
        </Button>
        {bannerBase64 && (
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-2 left-2 h-7 w-7 rounded-full bg-black/60 hover:bg-black/80"
            onClick={() => setBannerBase64('')}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Profile Picture */}
      <div className="flex justify-center -mt-12 mb-6 relative z-10">
        <div className="relative group">
          <div className="h-24 w-24 border-4 border-background rounded-full overflow-hidden">
            {avatarBase64 ? (
              <img
                src={`data:image/jpeg;base64,${avatarBase64}`}
                alt={fullName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold">
                {fullName?.charAt(0) || 'م'}
              </div>
            )}
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleImageChange(e, 'avatar')}
          />
          <Button
            variant="secondary"
            size="icon"
            className="absolute bottom-0 left-0 h-8 w-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => avatarInputRef.current?.click()}
          >
            <Camera className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4 max-w-lg mx-auto">
        <div className="space-y-2">
          <Label htmlFor="edit-name">الاسم الكامل</Label>
          <Input
            id="edit-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="أحمد محمد"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-username">اسم المستخدم</Label>
          <Input
            id="edit-username"
            value={username}
            onChange={(e) => setUsername(e.target.value.replace('@', ''))}
            placeholder="username"
            dir="ltr"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-bio">النبذة التعريفية</Label>
          <Textarea
            id="edit-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="اكتب نبذة عن نفسك..."
            className="min-h-[80px] resize-none"
            dir="rtl"
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