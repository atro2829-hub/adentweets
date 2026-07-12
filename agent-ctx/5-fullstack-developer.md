# Task 5 - Replace useSession with useAuth

## Summary
Replaced all `useSession` from `next-auth/react` with `useAuth` from `@/lib/auth-context` across 11 files.

## Changes Made

### Pattern Applied
- **Import**: `import { useSession } from 'next-auth/react'` → `import { useAuth } from '@/lib/auth-context'`
- **Destructuring**: `{ data: session }` → `{ session }`, `{ data: session, status }` → `{ session, isLoading }`
- **Type casts removed**: `session?.user as Record<string, unknown> | undefined` → direct `session?.user?.id/name/username/image` access
- **Auth checks**: `status === 'unauthenticated' || !session` → `!session && !isLoading`, `status === 'loading'` → `isLoading`

### Files Modified
1. `src/app/page.tsx`
2. `src/components/layout/sidebar.tsx`
3. `src/components/layout/bottom-nav.tsx`
4. `src/views/home-view.tsx`
5. `src/views/profile-view.tsx`
6. `src/views/edit-profile-view.tsx`
7. `src/views/post-detail-view.tsx`
8. `src/views/chat-view.tsx`
9. `src/views/settings-view.tsx`
10. `src/components/tweets/create-post-dialog.tsx`
11. `src/components/tweets/post-card.tsx`

### Preserved
- `signIn` import in `auth-view.tsx` (not affected by React 19 issue)

### Verification
- `grep -r "useSession" src/` → 0 results
- `bun run lint` → 0 errors, 0 warnings