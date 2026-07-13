class AppStrings {
  static const String appName = 'AdenTweets Admin';
  static const String tagline = 'Social Media Platform Management';
  static const String login = 'Admin Login';
  static const String logout = 'Logout';
  static const String email = 'Email';
  static const String password = 'Password';
  static const String dashboard = 'Dashboard';
  static const String users = 'Users';
  static const String moderation = 'Moderation';
  static const String reports = 'Reports';
  static const String analytics = 'Analytics';
  static const String settings = 'Settings';
  static const String search = 'Search users...';
  static const String totalUsers = 'Total Users';
  static const String totalPosts = 'Total Posts';
  static const String pendingReports = 'Pending Reports';
  static const String activeToday = 'Active Today';
  static const String suspend = 'Suspend';
  static const String ban = 'Ban';
  static const String delete = 'Delete';
  static const String resolve = 'Resolve';
  static const String reject = 'Reject';
  static const String cancel = 'Cancel';
  static const String save = 'Save';
  static const String loading = 'Loading...';
  static const String error = 'Something went wrong';
  static const String tryAgain = 'Try Again';
  static const String noUsers = 'No users found';
  static const String noPosts = 'No posts found';
  static const String noReports = 'No reports found';
  static const String recentActivity = 'Recent Activity';
  static const String userGrowth = 'User Growth';
  static const String postTrends = 'Post Trends';
  static const String darkMode = 'Dark Mode';
  static const String lightMode = 'Light Mode';
  static const String allUsers = 'All';
  static const String suspendedUsers = 'Suspended';
  static const String bannedUsers = 'Banned';
  static const String pendingStatus = 'Pending';
  static const String resolvedStatus = 'Resolved';
  static const String rejectedStatus = 'Rejected';
  static const String allStatus = 'All';
  static const String confirmAction = 'Are you sure?';
  static const String suspendConfirm = 'This will suspend the user.';
  static const String banConfirm = 'This will ban the user permanently.';
  static const String deleteConfirm = 'This will delete this item permanently.';
  static const String resolveConfirm = 'This will mark the report as resolved.';
  static const String rejectConfirm = 'This will dismiss the report.';
  static const String loginFailed = 'Login failed. Please check your credentials.';
  static const String adminEmail = 'Admin Email';
  static const String adminPassword = 'Admin Password';
  static const String signIn = 'Sign In';
}

class AppColors {
  static const int primary = 0xFF6C5CE7;
  static const int primaryLight = 0xFFA29BFE;
  static const int primaryDark = 0xFF5A4BD1;
  static const int background = 0xFFF8F9FA;
  static const int surface = 0xFFFFFFFF;
  static const int cardBackground = 0xFFFFFFFF;
  static const int textPrimary = 0xFF1A1A2E;
  static const int textSecondary = 0xFF6B7280;
  static const int textDisabled = 0xFF9CA3AF;
  static const int divider = 0xFFE5E7EB;
  static const int error = 0xFFEF4444;
  static const int success = 0xFF22C55E;
  static const int warning = 0xFFF59E0B;
  static const int info = 0xFF3B82F6;
  static const int danger = 0xFFDC2626;
  static const int suspended = 0xFFF59E0B;
  static const int banned = 0xFFDC2626;

  static const int darkBackground = 0xFF1A1A2E;
  static const int darkSurface = 0xFF16213E;
  static const int darkCard = 0xFF1E2A4A;
  static const int darkTextPrimary = 0xFFE7E9EA;
  static const int darkTextSecondary = 0xFF8892A0;
  static const int darkDivider = 0xFF2F3336;
}

class AppDimens {
  static const double paddingSmall = 8.0;
  static const double paddingMedium = 16.0;
  static const double paddingLarge = 24.0;
  static const double paddingXLarge = 32.0;
  static const double borderRadiusSmall = 8.0;
  static const double borderRadiusMedium = 12.0;
  static const double borderRadiusLarge = 16.0;
  static const double borderRadiusXL = 24.0;
  static const double avatarSmall = 32.0;
  static const double avatarMedium = 40.0;
  static const double avatarLarge = 56.0;
  static const double avatarXLarge = 80.0;
  static const double iconSize = 24.0;
  static const double cardElevation = 2.0;
  static const double statsCardHeight = 120.0;
}

class FirebasePaths {
  static const String users = 'users';
  static const String posts = 'posts';
  static const String comments = 'comments';
  static const String likes = 'likes';
  static const String follows = 'follows';
  static const String messages = 'messages';
  static const String conversations = 'conversations';
  static const String notifications = 'notifications';
  static const String bookmarks = 'bookmarks';
  static const String feeds = 'feeds';
  static const String reports = 'reports';
  static const String analytics = 'analytics';
}

class RouteNames {
  static const String splash = '/splash';
  static const String login = '/login';
  static const String dashboard = '/dashboard';
  static const String users = '/users';
  static const String moderation = '/moderation';
  static const String reports = '/reports';
  static const String analytics = '/analytics';
  static const String settings = '/settings';
  static const String userDetail = '/users/:userId';
  static const String postDetail = '/posts/:postId';
  static const String reportDetail = '/reports/:reportId';
}