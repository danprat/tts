# 📱 Android APK Build Guide - Multi-Process TTS App

> **Step-by-step guide untuk build React TTS app menjadi Android APK**

## 🚀 **Prerequisites**

### 1. Android Studio & SDK
```bash
# Download Android Studio dari:
https://developer.android.com/studio

# Install Android SDK, Build Tools, Platform Tools
# Set ANDROID_HOME environment variable
export ANDROID_HOME=/path/to/android-sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

### 2. Java Development Kit (JDK)
```bash
# Install JDK 11 atau 17
# macOS dengan Homebrew:
brew install openjdk@11

# Set JAVA_HOME
export JAVA_HOME=/opt/homebrew/opt/openjdk@11
```

## 🛠️ **Build Process**

### Step 1: Build React App
```bash
# Build production version
npm run build

# Verify dist folder exists dengan files
ls -la dist/
```

### Step 2: Sync Capacitor
```bash
# Sync built app ke Android platform
npx cap sync android

# Copy semua assets dan plugins
npx cap copy android
```

### Step 3: Open Android Studio
```bash
# Buka project Android di Android Studio
npx cap open android
```

### Step 4: Build APK di Android Studio

#### **Option A: Debug APK (Quick)**
1. **Menu:** Build → Build Bundle(s) / APK(s) → Build APK(s)
2. **Wait:** Gradle build process selesai
3. **Location:** `android/app/build/outputs/apk/debug/app-debug.apk`

#### **Option B: Release APK (Production)**
1. **Generate Keystore** (first time only):
   ```bash
   keytool -genkey -v -keystore release-key.keystore -alias tts-app -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Create signed APK:**
   - **Menu:** Build → Generate Signed Bundle / APK
   - **Choose:** APK
   - **Keystore:** Browse ke release-key.keystore
   - **Build Type:** Release
   - **Location:** `android/app/build/outputs/apk/release/app-release.apk`

## 📱 **APK Specifications**

### App Information
- **Package ID:** `com.danypratmanto.tts`
- **App Name:** Multi-Process TTS
- **Version:** 1.0.0
- **Target SDK:** Android 13+ (API 33)
- **Min SDK:** Android 7.0+ (API 24)

### Features & Permissions
```xml
<!-- Automatically added by Capacitor -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

### App Size Estimation
- **Debug APK:** ~8-12 MB
- **Release APK:** ~6-8 MB (dengan optimization)
- **Install Size:** ~15-20 MB on device

## 🎨 **Customization**

### App Icon
```bash
# Replace default icon dengan custom icon
# Files needed:
android/app/src/main/res/mipmap-hdpi/ic_launcher.png (72x72)
android/app/src/main/res/mipmap-mdpi/ic_launcher.png (48x48)
android/app/src/main/res/mipmap-xhdpi/ic_launcher.png (96x96)
android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png (144x144)
android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png (192x192)
```

### Splash Screen
```bash
# Custom splash screen
android/app/src/main/res/drawable/splash.png
android/app/src/main/res/values/colors.xml
```

## 🚀 **Command Line Build (Advanced)**

### Build Debug APK
```bash
# Navigate ke android folder
cd android

# Build debug APK
./gradlew assembleDebug

# Output location
ls -la app/build/outputs/apk/debug/
```

### Build Release APK
```bash
# Build release APK (perlu keystore setup)
./gradlew assembleRelease

# Output location
ls -la app/build/outputs/apk/release/
```

## 📋 **Testing & Distribution**

### Install APK untuk Testing
```bash
# Install via ADB (Android Debug Bridge)
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Install on specific device
adb -s DEVICE_ID install app-debug.apk

# Uninstall
adb uninstall com.danypratmanto.tts
```

### Distribution Options
1. **Direct APK sharing** - WhatsApp, email, cloud storage
2. **Google Play Store** - Upload release APK ke Play Console
3. **Internal distribution** - Firebase App Distribution, TestFlight equivalent

## 🔧 **Troubleshooting**

### Common Issues

**❌ Gradle build failed**
```bash
# Clean dan rebuild
cd android
./gradlew clean
./gradlew assembleDebug
```

**❌ Android SDK not found**
```bash
# Check ANDROID_HOME
echo $ANDROID_HOME

# Set correct path
export ANDROID_HOME=/Users/username/Library/Android/sdk
```

**❌ JDK version issues**
```bash
# Check Java version
java -version

# Use JDK 11 atau 17
export JAVA_HOME=/path/to/jdk-11
```

**❌ APK size too large**
```bash
# Enable Proguard dan optimization
# Edit android/app/build.gradle:
buildTypes {
    release {
        minifyEnabled true
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

## 📱 **Mobile-Specific Features**

### Network Detection
```javascript
// Detect network status
import { Network } from '@capacitor/network';

const logCurrentNetworkStatus = async () => {
  const status = await Network.getStatus();
  console.log('Network status:', status);
};
```

### File Download untuk Mobile
```javascript
// Enhanced download untuk mobile
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const downloadToMobile = async (audioBlob, filename) => {
  const base64Data = await blobToBase64(audioBlob);
  
  const result = await Filesystem.writeFile({
    path: filename,
    data: base64Data,
    directory: Directory.Downloads
  });
  
  // Share file
  await Share.share({
    title: 'TTS Audio Generated',
    url: result.uri,
    dialogTitle: 'Share your audio'
  });
};
```

## 🎯 **Performance Optimization**

### Mobile-Specific Settings
```javascript
// Optimize untuk mobile performance
const mobileSettings = {
  chunkSize: 300,        // Smaller chunks untuk mobile
  maxConcurrency: 2,     // Conservative concurrency
  enableOffline: true,   // Cache untuk offline use
  compressionLevel: 0.8  // Audio compression
};
```

## 📊 **Analytics & Monitoring**

### Crash Reporting
```bash
# Add Firebase Crashlytics
npm install @capacitor-firebase/crashlytics
```

### Performance Monitoring
```bash
# Add Firebase Performance
npm install @capacitor-firebase/performance
```

## 🚀 **Quick Commands Summary**

```bash
# Complete build process dalam 1 script
npm run build && npx cap sync android && npx cap open android

# Build APK via command line
cd android && ./gradlew assembleDebug

# Install APK untuk testing
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 👤 **Developer**

**Dany Pratmanto**  
📱 **WhatsApp:** [08974041777](https://wa.me/6208974041777?text=Halo%20Dany%2C%20saya%20butuh%20bantuan%20build%20Android%20APK)  
💼 **GitHub:** [@danprat](https://github.com/danprat)  

> *Need help dengan Android build process? Contact via WhatsApp untuk consultation!*

---

**APK Ready untuk Production! 📱🚀** 