import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (seconds < 10) return 'الآن';
  if (seconds < 60) return `منذ ${seconds}ث`;
  if (minutes < 60) return `منذ ${minutes} د`;
  if (hours < 24) return `منذ ${hours} س`;
  if (days < 7) return `منذ ${days} ي`;
  if (weeks < 4) return `منذ ${weeks} أسبوع`;
  if (months < 12) return `منذ ${months} شهر`;
  return `منذ ${Math.floor(months / 12)} سنة`;
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}م`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}ك`;
  return num.toString();
}

export function getConversationId(uid1: string, uid2: string): string {
  return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
}

export function compressImage(file: File, maxWidth = 1200, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas context failed')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        const base64 = canvas.toDataURL('image/jpeg', quality).split(',')[1];
        resolve(base64);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\u0600-\u06FFa-zA-Z0-9_]+/g);
  return matches ? [...new Set(matches)] : [];
}

export function highlightContent(text: string): React.JSX.Element[] {
  const parts = text.split(/(#[\u0600-\u06FFa-zA-Z0-9_]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('#')) {
      return <span key={i} className="text-sky-500 hover:underline cursor-pointer">{part}</span>;
    }
    if (part.startsWith('@')) {
      return <span key={i} className="text-sky-500 hover:underline cursor-pointer">{part}</span>;
    }
    return <span key={i}>{part}</span>;
  });
}

export interface FeedScore {
  post: import('./types').PostData;
  score: number;
}

export function rankPosts(
  posts: import('./types').PostData[],
  currentUserUid: string | null,
  followingIds: Set<string>,
  interactions: Record<string, number>
): import('./types').PostData[] {
  const now = Date.now();
  const scored = posts.map(post => {
    let score = 0;
    const ageHours = (now - post.timestamp) / (1000 * 60 * 60);

    // Recency (exponential decay)
    score += Math.exp(-ageHours / 4) * 30;

    // Engagement
    score += (post.likesCount * 3) + (post.commentsCount * 5) + (post.repostsCount * 4) + (post.viewsCount * 0.1);

    // Following boost
    if (followingIds.has(post.userId)) score += 20;

    // Not own post
    if (post.userId !== currentUserUid) score += 5;

    // Has image
    if (post.imageBase64) score += 8;

    // Has content length
    if (post.content.length > 50) score += 3;

    // Interaction history
    const userInteractions = interactions[post.userId] || 0;
    score += Math.min(userInteractions * 2, 20);

    // Pinned posts get lower score in for-you
    if (post.isPinned) score -= 15;

    // Small random factor for variety
    score += Math.random() * 5;

    return { post, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map(s => s.post);
}