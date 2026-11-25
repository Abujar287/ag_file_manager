#!/usr/bin/env bash
set -e

echo "=== Building Real Signed Android APK for AG File Manager ==="

BUILD_DIR="/tmp/android-apk-build"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/src/com/agfilemanager/app"
mkdir -p "$BUILD_DIR/res/values"
mkdir -p "$BUILD_DIR/res/drawable"
mkdir -p "$BUILD_DIR/assets"
mkdir -p "$BUILD_DIR/obj"

# 1. AndroidManifest.xml
cat <<'EOF' > "$BUILD_DIR/AndroidManifest.xml"
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.agfilemanager.app"
    android:versionCode="3"
    android:versionName="1.2.0">

    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="34" />

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.MANAGE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />

    <application
        android:label="@string/app_name"
        android:icon="@drawable/ic_launcher"
        android:allowBackup="true"
        android:hardwareAccelerated="true"
        android:requestLegacyExternalStorage="true"
        android:theme="@android:style/Theme.DeviceDefault.NoActionBar">
        
        <activity
            android:name="com.agfilemanager.app.MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden|screenLayout">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
EOF

# 2. strings.xml
cat <<'EOF' > "$BUILD_DIR/res/values/strings.xml"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">AG File Manager</string>
</resources>
EOF

# 3. Create app icon (drawable XML / vector)
cat <<'EOF' > "$BUILD_DIR/res/drawable/ic_launcher.xml"
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
  <path
      android:fillColor="#0D8CFF"
      android:pathData="M16,16h76a16,16 0 0,1 16,16v44a16,16 0 0,1 -16,16h-76a16,16 0 0,1 -16,-16v-44a16,16 0 0,1 16,-16z"/>
  <path
      android:fillColor="#FFFFFF"
      android:pathData="M32,36h16l8,8h20a4,4 0 0,1 4,4v24a4,4 0 0,1 -4,4h-44a4,4 0 0,1 -4,-4v-32a4,4 0 0,1 4,-4z"/>
</vector>
EOF

# 4. Generate R.java and compiled resources
echo "[1/7] Compiling resources with aapt..."
aapt package -f -m \
  -J "$BUILD_DIR/src" \
  -M "$BUILD_DIR/AndroidManifest.xml" \
  -S "$BUILD_DIR/res" \
  -I /opt/android-tools/android.jar

# 5. MainActivity.java
cat <<'EOF' > "$BUILD_DIR/src/com/agfilemanager/app/MainActivity.java"
package com.agfilemanager.app;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.ValueCallback;
import android.net.Uri;
import android.content.Intent;
import android.view.Window;
import android.view.WindowManager;

public class MainActivity extends Activity {
    private WebView webView;
    private ValueCallback<Uri[]> uploadMessage;
    private final static int FILECHOOSER_RESULTCODE = 101;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setDatabaseEnabled(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback,
                                              FileChooserParams fileChooserParams) {
                if (uploadMessage != null) {
                    uploadMessage.onReceiveValue(null);
                    uploadMessage = null;
                }
                uploadMessage = filePathCallback;
                Intent intent = fileChooserParams.createIntent();
                try {
                    startActivityForResult(intent, FILECHOOSER_RESULTCODE);
                } catch (Exception e) {
                    uploadMessage = null;
                    return false;
                }
                return true;
            }
        });

        webView.loadUrl("file:///android_asset/dist/index.html");
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILECHOOSER_RESULTCODE) {
            if (uploadMessage == null) return;
            uploadMessage.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            uploadMessage = null;
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
EOF

# 6. Compile Java classes
echo "[2/7] Compiling Java source with javac..."
javac -encoding UTF-8 \
  -cp /opt/android-tools/android.jar \
  -d "$BUILD_DIR/obj" \
  "$BUILD_DIR/src/com/agfilemanager/app"/*.java

# 7. Compile classes to classes.dex with D8
echo "[3/7] Compiling bytecode to classes.dex with D8..."
java -cp /opt/android-tools/d8.jar com.android.tools.r8.D8 \
  --lib /opt/android-tools/android.jar \
  --release \
  --output "$BUILD_DIR" \
  "$BUILD_DIR/obj/com/agfilemanager/app"/*.class

# 8. Copy web bundle into assets
echo "[4/7] Packaging assets..."
mkdir -p "$BUILD_DIR/assets/dist"
cp -r dist/* "$BUILD_DIR/assets/dist/"

# 9. Package base APK
echo "[5/7] Creating unaligned APK with aapt..."
aapt package -f \
  -M "$BUILD_DIR/AndroidManifest.xml" \
  -S "$BUILD_DIR/res" \
  -A "$BUILD_DIR/assets" \
  -I /opt/android-tools/android.jar \
  -F "$BUILD_DIR/app-unaligned.apk"

# Add classes.dex into APK
cd "$BUILD_DIR"
aapt add app-unaligned.apk classes.dex
cd - > /dev/null

# 10. Align APK with zipalign
echo "[6/7] Aligning APK with zipalign..."
zipalign -f -p 4 "$BUILD_DIR/app-unaligned.apk" "$BUILD_DIR/app-aligned.apk"

# 11. Create or use keystore and sign with apksigner
echo "[7/7] Signing APK with apksigner..."
KEYSTORE="/opt/android-tools/release.keystore"
if [ ! -f "$KEYSTORE" ]; then
  keytool -genkeypair -v \
    -keystore "$KEYSTORE" \
    -alias ag_key \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -storepass "agpassword123" \
    -keypass "agpassword123" \
    -dname "CN=Abujar Al-Gifari, OU=AG File Manager, O=AG Software, C=BD"
fi

FINAL_APK="/tmp/AG_File_Manager_v1.2.0.apk"
apksigner sign \
  --ks "$KEYSTORE" \
  --ks-pass pass:agpassword123 \
  --key-pass pass:agpassword123 \
  --out "$FINAL_APK" \
  "$BUILD_DIR/app-aligned.apk"

echo "Verifying signature..."
apksigner verify --verbose "$FINAL_APK"

# Distribute final APK to all standard locations
cp "$FINAL_APK" public/downloads/AG_File_Manager_v1.2.0.apk
cp "$FINAL_APK" dist/downloads/AG_File_Manager_v1.2.0.apk
cp "$FINAL_APK" apk/AG_File_Manager_v1.2.0.apk
cp "$FINAL_APK" AG_File_Manager_v1.2.0.apk
mkdir -p android-project/app/release
cp "$FINAL_APK" android-project/app/release/app-release.apk

APK_SIZE=$(stat -c%s "$FINAL_APK" 2>/dev/null || stat -f%z "$FINAL_APK" 2>/dev/null)
echo "=== SUCCESS! Real Android APK created successfully ==="
echo "Path: public/downloads/AG_File_Manager_v1.2.0.apk"
echo "Size: $APK_SIZE bytes"
