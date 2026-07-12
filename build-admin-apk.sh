#!/bin/bash
set -e

echo "========================================="
echo "  AdenTweets - Admin App APK Builder"
echo "========================================="

# Check prerequisites
if [ -z "$JAVA_HOME" ]; then
  if command -v javac &> /dev/null; then
    JAVA_HOME=$(dirname $(dirname $(readlink -f $(which javac))))
    export JAVA_HOME
  else
    echo "✗ No JDK found. Install JDK 21+"
    exit 1
  fi
fi

if [ -z "$ANDROID_HOME" ]; then
  if [ -d "$HOME/Android/Sdk" ]; then
    export ANDROID_HOME="$HOME/Android/Sdk"
  elif [ -d "/usr/lib/android-sdk" ]; then
    export ANDROID_HOME="/usr/lib/android-sdk"
  else
    echo "✗ Android SDK not found"
    exit 1
  fi
fi

export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"

# Step 1: Build Next.js
echo "📦 Step 1: Building Next.js..."
bun install
npx next build

# Step 2: Setup Admin Android project
echo "📦 Step 2: Setting up Admin Android project..."
ADMIN_ANDROID_DIR="android-admin"

if [ ! -d "$ADMIN_ANDROID_DIR" ]; then
  # Temporarily switch config for admin
  cat > capacitor.config.admin.json << 'ADMINCFG'
{
  "appId": "com.adentweets.admin",
  "appName": "AdenTweets Admin",
  "webDir": "out",
  "server": { "androidScheme": "https", "cleartext": true },
  "plugins": {},
  "android": { "backgroundColor": "#000000", "allowMixedContent": true }
}
ADMINCFG

  # Backup original config
  cp capacitor.config.json capacitor.config.json.bak
  cp capacitor.config.admin.json capacitor.config.json
  
  npx cap add android "$ADMIN_ANDROID_DIR"
  
  # Restore original config
  mv capacitor.config.json.bak capacitor.config.json
fi

# Step 3: Update admin app config
echo "📦 Step 3: Configuring Admin App..."
cat > "$ADMIN_ANDROID_DIR/app/src/main/assets/capacitor.config.json" << 'EOF'
{
  "appId": "com.adentweets.admin",
  "appName": "AdenTweets Admin",
  "webDir": "out",
  "server": { "androidScheme": "https", "cleartext": true }
}
EOF

# Copy Firebase config
cp "upload/google-services (19).json" "$ADMIN_ANDROID_DIR/app/google-services.json"

# Update package name in build.gradle
sed -i 's/com.adentweets.app/com.adentweets.admin/g' "$ADMIN_ANDROID_DIR/app/build.gradle"
sed -i 's/com.adentweets.app/com.adentweets.admin/g' "$ADMIN_ANDROID_DIR/app/src/main/AndroidManifest.xml"

# Sync web assets
npx cap copy android --config capacitor.config.admin.json 2>/dev/null || \
  cp -r out/* "$ADMIN_ANDROID_DIR/app/src/main/assets/public/"

# Step 4: Build Admin APK
echo "📦 Step 4: Building Admin App APK..."
cd "$ADMIN_ANDROID_DIR"
chmod +x gradlew

./gradlew assembleDebug
echo ""
echo "✅ Admin App DEBUG APK: $ADMIN_ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"

cd ..
echo ""
echo "========================================="
echo "  ✅ Admin App build complete!"
echo "========================================="