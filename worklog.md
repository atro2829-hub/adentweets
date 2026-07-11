# AdenTweets Worklog

---
Task ID: 1
Agent: Main Orchestrator
Task: Design database schema (Prisma/SQLite) with all tables

Work Log:
- Designed comprehensive Prisma schema with 13 models: User, Post, Comment, Like, Retweet, Follow, Notification, Message, Conversation, Hashtag, PostHashtag, Bookmark, Block, Mute
- Fixed multiple relation issues (missing array types on back-relations, ambiguous relations)
- Successfully pushed schema to SQLite database
- Generated Prisma client

Stage Summary:
- Database schema complete and pushed
- All 13 models with proper indexes and unique constraints
- Prisma client generated at node_modules/@prisma/client

---
Task ID: 3
Agent: Full-Stack Developer (Chat Service)
Task: Create Socket.io mini-service for real-time messaging

Work Log:
- Created `/mini-services/chat-service/` directory with independent package.json
- Installed dependencies: socket.io ^4.8.3, @prisma/client, @types/bun
- Copied generated Prisma client from parent project's node_modules to mini-service
- Created `index.ts` with Socket.io server on port 3004
- Implemented 5 core event handlers:
  1. **join** - User connects and joins their userId room; broadcasts online status
  2. **private_message** - Saves message to DB, finds/creates Conversation, emits to recipient and confirms to sender
  3. **typing / stop_typing** - Forwards typing indicators to the intended recipient
  4. **disconnect** - Cleans up online status, emits user_offline when all sockets for a user disconnect
  5. **message_read** - Marks unread messages as read in DB, notifies both parties
- Each user joins a socket room named by their userId for targeted delivery
- Multi-socket per user support (tracks Set of socket IDs per user)
- Graceful shutdown on SIGINT/SIGTERM (closes server + disconnects DB)
- Service started successfully and verified listening on port 3004

Stage Summary:
- Chat service running on port 3004 (PID confirmed via lsof)
- Frontend can connect via `io("/?XTransformPort=3004")`
- All Message and Conversation DB operations use PrismaClient pointing to main project's SQLite DB

---
Task ID: 2
Agent: Full-Stack Developer (API Routes)
Task: Create ALL API routes for AdenTweets application

Work Log:
- Created 16 API route files covering all application functionality
- All routes use `db` from `@/lib/db`, `getServerSession` from `next-auth`, and `authOptions` from `@/lib/auth`
- All error messages in Arabic
- All responses use NextResponse.json() with proper HTTP status codes
- All routes include try/catch error handling and authentication checks (except register)
- Cursor-based pagination implemented for feeds, comments, notifications, bookmarks, messages

Files created:

1. **`/api/users/route.ts`** — GET (search users by `q` param / get current profile), PUT (update profile fields)
2. **`/api/users/[username]/route.ts`** — GET public profile with isFollowing/isBlocked status
3. **`/api/users/register/route.ts`** — POST register with bcrypt password hashing, email/username uniqueness checks
4. **`/api/posts/route.ts`** — GET feed (followed users + own posts, cursor pagination), POST create (hashtag extraction, user postsCount increment)
5. **`/api/posts/[id]/route.ts`** — GET single post (with like/retweet/bookmark status, views increment, quote retweet parent), PUT update (30-min limit, owner only, re-process hashtags), DELETE soft delete
6. **`/api/likes/route.ts`** — POST like (increment count, create notification), DELETE unlike (decrement count)
7. **`/api/comments/route.ts`** — GET comments for post (top-level only, pagination, like status), POST create (increment count, create notification, supports parentId for replies)
8. **`/api/follows/route.ts`** — POST follow (block check, count increments, notification), DELETE unfollow (count decrements)
9. **`/api/retweets/route.ts`** — POST retweet (count increment, notification), DELETE undo (count decrement)
10. **`/api/notifications/route.ts`** — GET (with unreadOnly filter, pagination, actor user data), PUT (mark single read or markAll via body)
11. **`/api/notifications/mark-all/route.ts`** — PUT dedicated endpoint to mark all notifications as read
12. **`/api/bookmarks/route.ts`** — GET (with post data, pagination), POST bookmark, DELETE remove bookmark
13. **`/api/search/route.ts`** — GET search posts, users, and hashtags by query `q`
14. **`/api/blocks/route.ts`** — POST block (removes mutual follow relationships, recalculates counts), DELETE unblock
15. **`/api/messages/route.ts`** — GET conversations (with last message, other user data, unread count), POST send message (finds/creates conversation)
16. **`/api/messages/[conversationId]/route.ts`** — GET messages (pagination, auto-mark as read, verifies user belongs to conversation)

Key Design Decisions:
- Feed posts include `isLiked`, `isRetweeted`, `isBookmarked` booleans for logged-in users
- Post creation extracts `#hashtags` from content, upserts Hashtag records, creates PostHashtag links
- Post updates re-process hashtags (delete old, create new) to keep them in sync
- Soft delete on posts (isDeleted=true) rather than hard delete
- Block action automatically removes mutual follow relationships and recalculates follower/following counts
- Messages auto-find or auto-create Conversation records
- Messages GET endpoint auto-marks unread messages as read
- Cursor-based pagination (using createdAt) across all list endpoints
- Notifications include full actor user data via Prisma include
- ESLint passes with 0 errors (only 2 pre-existing warnings from other files)

Stage Summary:
- 16 API route files created covering all 14 model operations
- Full CRUD for posts, comments, likes, retweets, follows, bookmarks, blocks, messages
- Search across posts, users, and hashtags
- Real-time-ready notification system
- Conversation-based messaging with auto-read

---
Task ID: 4
Agent: Full-Stack Developer (View Components)
Task: Create ALL view components and main page.tsx shell for AdenTweets

Work Log:
- Created Zustand app store (`src/store/app-store.ts`) with navigation system (currentView, viewParams, viewHistory, navigate, goBack) and UI state (createPostOpen, sidebarOpen)
- Created 18 view/component files covering the entire UI surface area
- All text is in Arabic, all components follow RTL layout conventions
- Used shadcn/ui components throughout (Button, Input, Textarea, Avatar, Sheet, Tabs, Skeleton, Switch, Badge, Separator, Dialog, DropdownMenu, etc.)
- Consistent dark-theme-first design with hover effects, loading states (Skeleton), and error handling (toast notifications)
- ESLint passes with 0 errors and 0 warnings

Files created:

**Core Infrastructure:**
1. `src/store/app-store.ts` — Zustand store with ViewType union, navigation (navigate/goBack/viewHistory), and UI state

**Reusable Components:**
2. `src/components/tweets/post-card.tsx` — PostCard component with user info, content (clickable hashtags), images, engagement buttons (like/retweet/comment/share/bookmark) with optimistic updates and color states (rose for likes, emerald for retweets, amber for bookmarks, sky for comments)
3. `src/components/tweets/create-post-dialog.tsx` — Sheet-based dialog with textarea (280 char limit), image URL input, character counter, submit with loading state
4. `src/components/layout/sidebar.tsx` — Desktop sidebar (20px icons / 264px expanded) + Mobile sidebar (Sheet). 7 nav items with active state, create post button, user info at bottom
5. `src/components/layout/bottom-nav.tsx` — Mobile bottom nav with 5 items (Home, Explore, Create+, Notifications, Messages), notification badges, polling for unread counts

**Views (13 total):**
6. `src/views/auth-view.tsx` — Login/Signup/ForgotPassword forms with email/password/username fields, validation, loading states, next-auth signIn integration, centered card design with branding
7. `src/views/home-view.tsx` — Home feed with tabs (لك/الكل), inline post creation, infinite scroll via IntersectionObserver, Skeleton loading states, empty states
8. `src/views/explore-view.tsx` — Search bar, trending hashtags section, suggested users with follow/unfollow, grid layout
9. `src/views/notifications-view.tsx` — Tabs (الكل/غير المقروءة), notification list with type-specific icons (like/comment/retweet/follow), mark-as-read, mark-all-as-read
10. `src/views/messages-view.tsx` — Conversation list with avatar, name, last message preview, time, unread badge
11. `src/views/chat-view.tsx` — Real-time chat via Socket.io (port 3004), message bubbles (sent/received), typing indicator, scroll-to-bottom, online status
12. `src/views/profile-view.tsx` — Banner + avatar, user stats (followers/following/posts), bio/location/website/join date, tabs (المنشورات/الردود/الإعجابات/المرجعيات), follow/message/edit buttons
13. `src/views/edit-profile-view.tsx` — Edit form for name/username/bio/location/website/images, private account toggle, save with loading
14. `src/views/post-detail-view.tsx` — Full post view, reply input, replies list, back navigation
15. `src/views/bookmarks-view.tsx` — Bookmarked posts list with empty state
16. `src/views/settings-view.tsx` — Sections: المظهر (dark/light via next-themes), الخصوصية (private account), إعدادات الإشعارات (toggles), الحساب (deactivate - mock), معلومات التطبيق
17. `src/views/user-list-view.tsx` — Reusable followers/following list with follow/unfollow buttons, back navigation
18. `src/views/search-results-view.tsx` — Search results with tabs (الأحدث/الأشخاص/الصوور), user follow actions, image grid for photo results

**Main Shell:**
19. `src/app/page.tsx` — Entry point: checks auth via useSession, renders AuthView if unauthenticated, or main layout (sidebar + content + bottom nav + create post dialog). View routing via switch on currentView from Zustand store

Design Patterns:
- Optimistic UI updates for like/retweet/bookmark with rollback on API failure
- IntersectionObserver for infinite scroll on home feed
- Socket.io integration for real-time chat with typing indicators
- Skeleton loading states on all data-fetching views
- Consistent action button colors: rose (like), emerald (retweet), sky (comment), amber (bookmark)
- Responsive: sidebar on desktop (md+), bottom nav on mobile, content max-width 600px centered

Stage Summary:
- All 18 view/component files + Zustand store created
- Complete SPA navigation system without any Next.js routes
- ESLint: 0 errors, 0 warnings
- Dev server compiles successfully (confirmed in dev.log)

---
Task ID: 5
Agent: Full-Stack Developer
Task: Replace all `useSession` from `next-auth/react` with `useAuth` from `@/lib/auth-context`

Work Log:
- Replaced `useSession` hook with `useAuth` across 11 files to fix React 19 compatibility issue
- Updated all session data access patterns: removed `as Record<string, unknown>` casts, accessed `session?.user?.id`, `session?.user?.name`, `session?.user?.username`, `session?.user?.image` directly
- Updated auth status checks in `page.tsx`: `status === 'unauthenticated' || !session` → `!session && !isLoading`, `status === 'loading'` → `isLoading`
- Updated destructuring: `{ data: session }` → `{ session }`, `{ data: session, status }` → `{ session, isLoading }`
- Removed all intermediate `user` variable casts (e.g., `const user = session?.user as Record<string, unknown> | undefined`)
- Kept `signIn` import in `auth-view.tsx` (only `useSession` was targeted for removal)
- ESLint: 0 errors, 0 warnings

Files modified (11 total):
1. `src/app/page.tsx` — Import + destructuring + auth status checks
2. `src/components/layout/sidebar.tsx` — Import + destructuring + user access (image, name, username, id)
3. `src/components/layout/bottom-nav.tsx` — Import + destructuring
4. `src/views/home-view.tsx` — Import + destructuring + user access (image, name)
5. `src/views/profile-view.tsx` — Import + destructuring + sessionUser access (id, username)
6. `src/views/edit-profile-view.tsx` — Import + destructuring + user.id access
7. `src/views/post-detail-view.tsx` — Import + destructuring + user access in reply construction + avatar
8. `src/views/chat-view.tsx` — Import + destructuring + user.id for socket query + isMine check
9. `src/views/settings-view.tsx` — Import + destructuring + userId access
10. `src/components/tweets/create-post-dialog.tsx` — Import + destructuring + user access (image, name)
11. `src/components/tweets/post-card.tsx` — Import + destructuring + isOwnProfile check

Stage Summary:
- All 11 files migrated from `next-auth/react`'s `useSession` to custom `useAuth` from `@/lib/auth-context`
- Zero remaining `useSession` usages in the codebase
- `signIn` import in `auth-view.tsx` preserved (used for login form submission, not React 19 affected)
- ESLint clean: 0 errors, 0 warnings