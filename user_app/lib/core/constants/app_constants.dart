class AppStrings {
  static const String appName = 'AdenTweets';
  static const String tagline = 'Share your thoughts with the world';
  static const String login = 'Login';
  static const String signup = 'Sign Up';
  static const String logout = 'Logout';
  static const String email = 'Email';
  static const String password = 'Password';
  static const String username = 'Username';
  static const String fullName = 'Full Name';
  static const String bio = 'Bio';
  static const String confirmPassword = 'Confirm Password';
  static const String forgotPassword = 'Forgot Password?';
  static const String createAccount = 'Create Account';
  static const String alreadyHaveAccount = 'Already have an account? ';
  static const String dontHaveAccount = 'Don\'t have an account? ';
  static const String orContinueWith = 'Or continue with';
  static const String google = 'Google';
  static const String home = 'Home';
  static const String explore = 'Explore';
  static const String notifications = 'Notifications';
  static const String messages = 'Messages';
  static const String profile = 'Profile';
  static const String settings = 'Settings';
  static const String editProfile = 'Edit Profile';
  static const String followers = 'Followers';
  static const String following = 'Following';
  static const String posts = 'Posts';
  static const String likes = 'Likes';
  static const String replies = 'Replies';
  static const String media = 'Media';
  static const String post = 'Post';
  static const String comment = 'Comment';
  static const String share = 'Share';
  static const String delete = 'Delete';
  static const String save = 'Save';
  static const String cancel = 'Cancel';
  static const String search = 'Search';
  static const String trending = 'Trending';
  static const String whatIsHappening = 'What is happening?!';
  static const String tweet = 'Tweet';
  static const String reply = 'Reply';
  static const String retweet = 'Retweet';
  static const String noPostsYet = 'No posts yet';
  static const String noNotifications = 'No notifications yet';
  static const String noMessages = 'No messages yet';
  static const String noResults = 'No results found';
  static const String loading = 'Loading...';
  static const String error = 'Something went wrong';
  static const String tryAgain = 'Try Again';
  static const String verifyEmail = 'Verify Email';
  static const String sendResetLink = 'Send Reset Link';
  static const String resetPassword = 'Reset Password';
  static const String termsAgree = 'I agree to the Terms of Service and Privacy Policy';
  static const String sentResetEmail = 'Reset link sent to your email';
  static const String changeTheme = 'Change Theme';
  static const String changeLanguage = 'Change Language';
  static const String darkMode = 'Dark Mode';
  static const String lightMode = 'Light Mode';
  static const String arabic = 'العربية';
  static const String english = 'English';
  static const String about = 'About';
  static const String helpCenter = 'Help Center';
  static const String privacyPolicy = 'Privacy Policy';
  static const String termsOfService = 'Terms of Service';
  static const String deleteAccount = 'Delete Account';
  static const String blockUser = 'Block User';
  static const String reportUser = 'Report User';
  static const String muteUser = 'Mute User';
  static const String bookmark = 'Bookmark';
  static const String bookmarks = 'Bookmarks';
}

class AppColors {
  static const int primary = 0xFF1DA1F2;
  static const int primaryDark = 0xFF1A91DA;
  static const int background = 0xFFFFFFFF;
  static const int surface = 0xFFF5F5F5;
  static const int textPrimary = 0xFF000000;
  static const int textSecondary = 0xFF6B7280;
  static const int textDisabled = 0xFF9CA3AF;
  static const int divider = 0xFFE5E7EB;
  static const int error = 0xFFEF4444;
  static const int success = 0xFF22C55E;
  static const int like = 0xFFF91880;
  static const int retweet = 0xFF00BA7C;
  static const int verified = 0xFF1DA1F2;

  static const int darkBackground = 0xFF15202B;
  static const int darkSurface = 0xFF192734;
  static const int darkCard = 0xFF22303C;
  static const int darkTextPrimary = 0xFFE7E9EA;
  static const int darkTextSecondary = 0xFF71767B;
  static const int darkDivider = 0xFF2F3336;
  static const int darkBorder = 0xFF38444D;
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
  static const double borderRadiusCircle = 50.0;
  static const double avatarSmall = 32.0;
  static const double avatarMedium = 40.0;
  static const double avatarLarge = 56.0;
  static const double avatarXLarge = 80.0;
  static const double iconSize = 24.0;
  static const double maxPostLength = 280;
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
}

class RouteNames {
  static const String splash = '/splash';
  static const String login = '/login';
  static const String signup = '/signup';
  static const String forgotPassword = '/forgot-password';
  static const String emailVerification = '/email-verification';
  static const String home = '/home';
  static const String explore = '/explore';
  static const String notifications = '/notifications';
  static const String messages = '/messages';
  static const String profile = '/profile';
  static const String userProfile = '/user/:userId';
  static const String createPost = '/create-post';
  static const String postDetails = '/post/:postId';
  static const String editProfile = '/edit-profile';
  static const String followers = '/followers/:userId';
  static const String following = '/following/:userId';
  static const String chat = '/chat/:conversationId';
  static const String settings = '/settings';
  static const String bookmarks = '/bookmarks';
}
