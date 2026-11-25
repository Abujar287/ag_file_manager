#!/usr/bin/env bash
set -euo pipefail

echo "=== Building Real Signed Android APK (Gradle / Android SDK) ==="

ROOT_DIR="$(pwd)"

# Read versionCode & versionName dynamically from version.json
V_CODE=$(node -e "const v=require('./version.json'); console.log(v.versionCode || 3)")
V_NAME=$(node -e "const v=require('./version.json'); console.log(v.versionName || '1.2.0')")
APK_NAME="AG_File_Manager_v${V_NAME}.apk"

echo "Target Version: v${V_NAME} (versionCode=${V_CODE})"

# Locate JAVA_HOME
if [ -z "${JAVA_HOME:-}" ] && [ -d "/usr/lib/jvm/java-17-openjdk-amd64" ]; then
  export JAVA_HOME="/usr/lib/jvm/java-17-openjdk-amd64"
fi
if [ -n "${JAVA_HOME:-}" ]; then
  export PATH="$JAVA_HOME/bin:$PATH"
fi

# Locate ANDROID_HOME / ANDROID_SDK_ROOT
if [ -z "${ANDROID_HOME:-}" ]; then
  if [ -n "${ANDROID_SDK_ROOT:-}" ]; then
    export ANDROID_HOME="$ANDROID_SDK_ROOT"
  elif [ -d "/tmp/android-sdk" ]; then
    export ANDROID_HOME="/tmp/android-sdk"
  elif [ -d "$HOME/Android/Sdk" ]; then
    export ANDROID_HOME="$HOME/Android/Sdk"
  fi
fi
export ANDROID_SDK_ROOT="${ANDROID_HOME:-}"

if [ -z "${ANDROID_HOME:-}" ] || [ ! -d "${ANDROID_HOME}/platforms" ]; then
  echo "ERROR: Android SDK not found. Set ANDROID_HOME or install Android SDK in /tmp/android-sdk."
  exit 1
fi

# Locate Gradle
GRADLE_BIN=""
if [ -x "$ROOT_DIR/android-project/gradlew" ]; then
  GRADLE_BIN="$ROOT_DIR/android-project/gradlew"
elif command -v gradle >/dev/null 2>&1; then
  GRADLE_BIN="$(command -v gradle)"
elif [ -x "/tmp/gradle-dist/gradle-8.10.2/bin/gradle" ]; then
  GRADLE_BIN="/tmp/gradle-dist/gradle-8.10.2/bin/gradle"
fi

if [ -z "$GRADLE_BIN" ]; then
  echo "ERROR: Gradle not found."
  exit 1
fi

# 1. Build fresh web frontend unless SKIP_WEB_BUILD=1
if [ "${SKIP_WEB_BUILD:-0}" != "1" ] || [ ! -f "$ROOT_DIR/dist/index.html" ]; then
  echo "[1/4] Building web assets..."
  npm run build
fi

# 2. Copy web bundle into Android assets/dist (excluding any *.apk files)
echo "[2/4] Syncing web assets into android-project/app/src/main/assets/dist..."
ASSETS_DIST="$ROOT_DIR/android-project/app/src/main/assets/dist"
rm -rf "$ASSETS_DIST"
mkdir -p "$ASSETS_DIST"
node -e '
const fs = require("fs");
const path = require("path");
function copyFiltered(src, dest) {
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name.endsWith(".apk")) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(d, { recursive: true });
      copyFiltered(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}
copyFiltered(process.argv[1], process.argv[2]);
' "$ROOT_DIR/dist" "$ASSETS_DIST"

# 3. Compile signed Release APK with Gradle
echo "[3/4] Compiling Release APK with Gradle..."
pushd "$ROOT_DIR/android-project" >/dev/null
printf "sdk.dir=%s\n" "$ANDROID_HOME" > local.properties
"$GRADLE_BIN" assembleRelease \
  -PVERSION_CODE="$V_CODE" \
  -PVERSION_NAME="$V_NAME" \
  --no-daemon
popd >/dev/null

BUILT_APK=""
for candidate in \
  "$ROOT_DIR/android-project/app/build/outputs/apk/release/app-release.apk" \
  "$ROOT_DIR/android-project/app/build/outputs/apk/release/app-release-signed.apk"; do
  if [ -f "$candidate" ]; then
    BUILT_APK="$candidate"
    break
  fi
done

if [ -z "$BUILT_APK" ]; then
  echo "ERROR: Gradle build did not produce app-release.apk!"
  exit 1
fi

# 4. Verify APK signature & binary manifest integrity
echo "[4/4] Verifying APK signature and binary package integrity..."
APKSIGNER_BIN=$(command -v apksigner || find "$ANDROID_HOME/build-tools" -name apksigner | head -n 1 || true)
if [ -n "$APKSIGNER_BIN" ]; then
  CERT_OUTPUT=$("$APKSIGNER_BIN" verify --verbose --print-certs "$BUILT_APK")
  echo "$CERT_OUTPUT"
  if echo "$CERT_OUTPUT" | grep -q "CN=Android Debug"; then
    echo "ERROR: APK was signed with an ephemeral Android Debug keystore instead of a persistent release key!"
    exit 1
  fi
fi

AAPT_BIN=$(command -v aapt || find "$ANDROID_HOME/build-tools" -name aapt | head -n 1 || true)
if [ -n "$AAPT_BIN" ]; then
  "$AAPT_BIN" dump badging "$BUILT_APK" | head -n 10
fi

# Clean older versioned APKs and copy final signed APK to standard locations
mkdir -p "$ROOT_DIR/public/downloads" "$ROOT_DIR/dist/downloads" "$ROOT_DIR/apk" "$ROOT_DIR/android-project/app/release"
find "$ROOT_DIR" -maxdepth 1 -name "AG_File_Manager_v*.apk" ! -name "$APK_NAME" -delete
find "$ROOT_DIR/public/downloads" -maxdepth 1 -name "AG_File_Manager_v*.apk" ! -name "$APK_NAME" -delete
find "$ROOT_DIR/apk" -maxdepth 1 -name "AG_File_Manager_v*.apk" ! -name "$APK_NAME" -delete

cp -f "$BUILT_APK" "$ROOT_DIR/public/downloads/$APK_NAME"
cp -f "$BUILT_APK" "$ROOT_DIR/dist/downloads/$APK_NAME"
cp -f "$BUILT_APK" "$ROOT_DIR/apk/$APK_NAME"
cp -f "$BUILT_APK" "$ROOT_DIR/$APK_NAME"
cp -f "$BUILT_APK" "$ROOT_DIR/android-project/app/release/app-release.apk"

APK_SIZE=$(stat -c%s "$BUILT_APK" 2>/dev/null || stat -f%z "$BUILT_APK" 2>/dev/null)
echo "=== SUCCESS! Genuine Signed Android APK Ready ==="
echo "Version: v${V_NAME} (Build ${V_CODE})"
echo "Path: public/downloads/${APK_NAME}"
echo "Size: ${APK_SIZE} bytes"
