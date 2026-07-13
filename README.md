# AdenTweets - Social Media Platform

A complete social media platform built with Flutter and Firebase, consisting of two applications:

## 📱 User App (`user_app/`)
- **Package**: `com.adentweets.app`
- Twitter-like social media experience
- Features: Home feed, Explore, Messages, Notifications, Profile
- Post creation with Base64 image support
- Real-time messaging and notifications
- Follow/Unfollow system
- Dark/Light theme support
- Arabic (RTL) and English support

## 🔧 Admin App (`admin_app/`)
- **Package**: `com.adentweets.admin`
- Dashboard for platform management
- User management (suspend, ban, activate, delete)
- Content moderation
- Reports management
- Analytics with charts (fl_chart)
- Professional purple/dark theme

## 🏗 Architecture
- **State Management**: Riverpod
- **Navigation**: GoRouter with auth guards
- **Backend**: Firebase (Auth, Realtime Database, Messaging)
- **Image Storage**: Base64 encoding in Firebase Realtime Database

## 🚀 CI/CD
- GitHub Actions automatically builds both APKs on push
- Artifacts available in Actions tab
- Pre-releases created automatically

## ⚙️ Setup
1. Clone the repository
2. Each app has its own `pubspec.yaml` - run `flutter pub get` in each directory
3. Google Services JSON files are included for both apps
4. Run `flutter run` in either `user_app/` or `admin_app/` directory