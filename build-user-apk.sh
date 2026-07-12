#!/bin/bash
set -e

echo "========================================="
echo "  AdenTweets - User App APK Builder"
echo "========================================="

# Check for JAVA_HOME
if [ -z "$JAVA_HOME" ]; then
  echo "⚠️  JAVA_HOME not set, trying to auto-detect..."
  if command -v javac &> /dev/null; then
    JAVA_HOME=$(dirname $(dirname $(readlink -f $(which javac))))
    export JAVA_HOME
    echo "✓ Found JDK at $JAVA_HOME"
  else
    echo "✗ No JDK found. Install JDK 21+ and set JAVA_HOME"
    exit 1
  fi
fi

# Check for ANDROID_HOME
if [ -z "$ANDROID_HOME" ]; then
  if [ -d "$HOME/Android/Sdk" ]; then
    export ANDROID_HOME="$HOME/Android/Sdk"
  elif [ -d "/usr/lib/android-sdk" ]; then
    export ANDROID_HOME="/usr/lib/android-sdk"
  elif [ -d "$LOCALAPPDATA/Android/Sdk" ]; then
    export ANDROID_HOME="$LOCALAPPDATA/Android/Sdk"
  else
    echo "✗ ANDROID_HOME not set and Android SDK not found"
    echo "  Install Android Studio or set ANDROID_HOME"
    exit 1
  fi
fi

echo "✓ ANDROID_HOME: $ANDROID_HOME"
echo "✓ JAVA_HOME: $JAVA_HOME"

export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"

# Step 1: Build Next.js static export
echo ""
echo "📦 Step 1: Building Next.js static export..."
bun install
npx next build

# Step 2: Copy Firebase config
echo ""
echo "📦 Step 2: Copying Firebase config..."
cp "upload/google-services (19).json" android/app/google-services.json

# Step 3: Add Android platform if not exists
echo ""
echo "📦 Step 3: Syncing Capacitor..."
npx cap sync android

# Step 4: Build APK
echo ""
echo "📦 Step 4: Building User App APK..."
cd android
chmod +x gradlew

echo ""
echo "  Building DEBUG APK..."
./gradlew assembleDebug
echo ""
echo "✅ User App DEBUG APK: android/app/build/outputs/apk/debug/app-debug.apk"

echo ""
echo "  Building RELEASE APK (if keystore configured)..."
if [ -n "$KEYSTORE_PATH" ]; then
  ./gradlew assembleRelease
  echo "✅ User App RELEASE APK: android/app/build/outputs/apk/release/app-release.apk"
else
  echo "  ⚠️  No keystore configured. Set KEYSTORE_PATH for release build."
  echo "  Debug APK is ready for testing."
fi

cd ..
echo ""
echo "========================================="
echo "  ✅ User App build complete!"
echo "========================================="