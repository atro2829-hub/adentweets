'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useAppStore } from '@/store/app-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { ArrowRight, Camera, X, Save, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { ref, get, query, orderByChild, equalTo, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import { compressImage } from '@/lib/utils';
import { toast } from 'sonner';

const BIO_MAX = 160;
const formFields = [
  'fullName',
  'username',
  'bio',
  'location',
  'website',
  'birthDate',
] as const;

const stagger = {
  animate: { transition: { staggerChildren: 0.05 } },
};
const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export function EditProfileView() {
  const { user, userData, refresh } = useAuth();
  const userId = user?.uid;
  const { goBack } = useAppStore();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [avatarBase64, setAvatarBase64] = useState('');
  const [bannerBase64, setBannerBase64] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(true);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Original values for dirty check
  const originalValues = useRef({
    fullName: '',
    username: '',
    bio: '',
    location: '',
    website: '',
    birthDate: '',
    avatarBase64: '',
    bannerBase64: '',
  });

  // Populate from userData
  useEffect(() => {
    if (!userData) return;
    const values = {
      fullName: userData.fullName || '',
      username: userData.username || '',
      bio: userData.bio || '',
      location: userData.location || '',
      website: userData.website || '',
      birthDate: userData.birthDate || '',
      avatarBase64: userData.avatarBase64 || '',
      bannerBase64: userData.bannerBase64 || '',
    };
    setFullName(values.fullName);
    setUsername(values.username);
    setBio(values.bio);
    setLocation(values.location);
    setWebsite(values.website);
    setBirthDate(values.birthDate);
    setAvatarBase64(values.avatarBase64);
    setBannerBase64(values.bannerBase64);
    originalValues.current = values;
  }, [userData]);

  // Check username uniqueness
  useEffect(() => {
    if (!username || username === originalValues.current.username) {
      setUsernameAvailable(true);
      return;
    }
    setUsernameChecking(true);
    const timer = setTimeout(async () => {
      try {
        const usersRef = query(ref(db, 'users'), orderByChild('username'), equalTo(username));
        const snap = await get(usersRef);
        const exists = snap.exists();
        setUsernameAvailable(!exists);
      } catch {
        setUsernameAvailable(true);
      }
      setUsernameChecking(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [username]);

  const isDirty =
    fullName !== originalValues.current.fullName ||
    username !== originalValues.current.username ||
    bio !== originalValues.current.bio ||
    location !== originalValues.current.location ||
    website !== originalValues.current.website ||
    birthDate !== originalValues.current.birthDate ||
    avatarBase64 !== originalValues.current.avatarBase64 ||
    bannerBase64 !== originalValues.current.bannerBase64;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImage(file, 400, 0.8);
      setAvatarBase64(base64);
    } catch {
      toast.error('فشل في تحميل الصورة');
    }
    e.target.value = '';
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImage(file, 1200, 0.7);
      setBannerBase64(base64);
    } catch {
      toast.error('فشل في تحميل الصورة');
    }
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!userId) return;
    if (!username.trim()) {
      toast.error('اسم المستخدم مطلوب');
      return;
    }
    if (!usernameAvailable) {
      toast.error('اسم المستخدم مستخدم بالفعل');
      return;
    }

    setIsSaving(true);
    try {
      await update(ref(db, `users/${userId}`), {
        fullName: fullName.trim(),
        username: username.trim(),
        bio: bio.trim(),
        location: location.trim(),
        website: website.trim(),
        birthDate,
        avatarBase64,
        bannerBase64,
      });
      refresh();
      toast.success('تم حفظ التغييرات');
      goBack();
    } catch {
      toast.error('فشل في حفظ التغييرات');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (isDirty) {
      setShowDiscardDialog(true);
    } else {
      goBack();
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleBack}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">تعديل الملف الشخصي</h1>
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button
              size="sm"
              className="rounded-full px-5 font-bold"
              onClick={handleSave}
              disabled={isSaving || !usernameAvailable}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4 ml-1.5" />
                  حفظ
                </>
              )}
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Banner */}
      <div className="relative h-[150px] group">
        {bannerBase64 ? (
          <>
            <img
              src={`data:image/jpeg;base64,${bannerBase64}`}
              alt="الغلاف"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-3 right-3 h-9 w-9 rounded-full bg-black/50 hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setBannerBase64('')}
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-bl from-sky-600 via-purple-600 to-rose-600" />
        )}
        <button
          className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors"
          onClick={() => bannerInputRef.current?.click()}
        >
          <Camera className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleBannerChange}
        />
      </div>

      {/* Avatar */}
      <div className="relative -mt-12 px-4 z-10">
        <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
          {avatarBase64 ? (
            <img
              src={`data:image/jpeg;base64,${avatarBase64}`}
              alt="الصورة الشخصية"
              className="h-24 w-24 rounded-full object-cover border-4 border-background shadow-lg"
            />
          ) : (
            <div className="h-24 w-24 rounded-full bg-primary/20 border-4 border-background shadow-lg flex items-center justify-center text-3xl font-bold text-primary">
              {fullName?.charAt(0) || 'م'}
            </div>
          )}
          <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <Camera className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
      </div>

      {/* Form */}
      <motion.div
        className="px-4 mt-6 space-y-5"
        variants={stagger}
        initial="initial"
        animate="animate"
      >
        {/* Full Name */}
        <motion.div variants={fadeUp}>
          <Label className="text-muted-foreground text-sm">الاسم الكامل</Label>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1.5"
            maxLength={50}
          />
        </motion.div>

        {/* Username */}
        <motion.div variants={fadeUp}>
          <Label className="text-muted-foreground text-sm">@اسم المستخدم</Label>
          <div className="relative mt-1.5">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              className={usernameAvailable ? '' : 'border-rose-500 focus-visible:ring-rose-500'}
              maxLength={20}
              dir="ltr"
            />
            {usernameChecking && (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {!usernameAvailable && !usernameChecking && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-rose-500">غير متاح</span>
            )}
          </div>
        </motion.div>

        {/* Bio */}
        <motion.div variants={fadeUp}>
          <div className="flex justify-between items-center">
            <Label className="text-muted-foreground text-sm">السيرة الذاتية</Label>
            <span className={`text-xs ${bio.length > BIO_MAX ? 'text-rose-500' : 'text-muted-foreground'}`}>
              {bio.length}/{BIO_MAX}
            </span>
          </div>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
            className="mt-1.5 resize-none"
            rows={3}
            maxLength={BIO_MAX}
          />
        </motion.div>

        {/* Location */}
        <motion.div variants={fadeUp}>
          <Label className="text-muted-foreground text-sm">الموقع</Label>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="mt-1.5"
            placeholder="المدينة، البلد"
            maxLength={50}
          />
        </motion.div>

        {/* Website */}
        <motion.div variants={fadeUp}>
          <Label className="text-muted-foreground text-sm">الموقع الإلكتروني</Label>
          <Input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="mt-1.5"
            placeholder="https://example.com"
            dir="ltr"
            maxLength={100}
          />
        </motion.div>

        {/* Birth Date */}
        <motion.div variants={fadeUp}>
          <Label className="text-muted-foreground text-sm">تاريخ الميلاد</Label>
          <Input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="mt-1.5"
            dir="ltr"
          />
        </motion.div>
      </motion.div>

      {/* Discard Changes Dialog */}
      <Dialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تجاهل التغييرات؟</DialogTitle>
            <DialogDescription>
              لديك تغييرات غير محفوظة. هل تريد تجاهلها؟
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDiscardDialog(false)}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowDiscardDialog(false);
                goBack();
              }}
            >
              تجاهل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}