# 🍎 Quick Setup Guide for macOS - Android APK Build

> **Fast track setup untuk build Android APK di macOS**

## ⚡ **One-Command Setup (Recommended)**

```bash
# Install semua prerequisites dengan Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Java, Android Command Line Tools
brew install openjdk@11 android-commandlinetools

# Set environment variables
echo 'export JAVA_HOME=/opt/homebrew/opt/openjdk@11' >> ~/.zshrc
echo 'export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools' >> ~/.zshrc
echo 'export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools' >> ~/.zshrc

# Reload shell
source ~/.zshrc

# Accept Android licenses
yes | sdkmanager --licenses
```

## 🔧 **Manual Setup (Step by Step)**

### 1. Install Homebrew (if not installed)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Install Java 11
```bash
# Install OpenJDK 11
brew install openjdk@11

# Set JAVA_HOME
echo 'export JAVA_HOME=/opt/homebrew/opt/openjdk@11' >> ~/.zshrc
echo 'export PATH="/opt/homebrew/opt/openjdk@11/bin:$PATH"' >> ~/.zshrc

# Reload shell
source ~/.zshrc

# Verify Java installation
java -version
```

### 3. Install Android Command Line Tools
```bash
# Install Android CLI tools
brew install android-commandlinetools

# Set ANDROID_HOME
echo 'export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools' >> ~/.zshrc
echo 'export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin' >> ~/.zshrc
echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools' >> ~/.zshrc

# Reload shell
source ~/.zshrc

# Install required Android SDK components
sdkmanager "platform-tools" "platforms;android-33" "build-tools;33.0.0"

# Accept all licenses
yes | sdkmanager --licenses
```

## 🚀 **Quick Test**

```bash
# Test Java
java -version
# Should show: openjdk version "11.x.x"

# Test Android tools
sdkmanager --version
# Should show SDK Manager version

# Build APK
npm run android:build
```

## 🔧 **Alternative: Android Studio (GUI Method)**

### Option A: Android Studio Full
```bash
# Download dari: https://developer.android.com/studio
# Install via Homebrew Cask
brew install --cask android-studio

# Set ANDROID_HOME to Android Studio SDK
echo 'export ANDROID_HOME=$HOME/Library/Android/sdk' >> ~/.zshrc
echo 'export PATH=$PATH:$ANDROID_HOME/emulator' >> ~/.zshrc
echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools' >> ~/.zshrc
```

## 📱 **Build Your APK**

```bash
# Option 1: Using npm script (recommended)
npm run android:build

# Option 2: Using build script directly
./build-android.sh debug

# Option 3: Manual Capacitor commands
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

## 🎯 **Expected Output Locations**

```bash
# Debug APK
android/app/build/outputs/apk/debug/app-debug.apk

# Release APK (with keystore)
android/app/build/outputs/apk/release/app-release.apk
```

## ⚡ **Quick Troubleshooting**

### ❌ "Java Runtime not found"
```bash
# Check Java installation
java -version

# If not found, install:
brew install openjdk@11
echo 'export JAVA_HOME=/opt/homebrew/opt/openjdk@11' >> ~/.zshrc
source ~/.zshrc
```

### ❌ "Android SDK not found"
```bash
# Check Android SDK
echo $ANDROID_HOME
sdkmanager --version

# If not found, install:
brew install android-commandlinetools
echo 'export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools' >> ~/.zshrc
source ~/.zshrc
```

### ❌ "Gradle build failed"
```bash
# Clean and rebuild
cd android
./gradlew clean
./gradlew assembleDebug
```

## 🍎 **macOS-Specific Notes**

### M1/M2 Mac (Apple Silicon)
- Homebrew path: `/opt/homebrew/`
- Java path: `/opt/homebrew/opt/openjdk@11`
- Everything should work out of the box dengan setup di atas

### Intel Mac
- Homebrew path: `/usr/local/`
- Java path: `/usr/local/opt/openjdk@11`
- Adjust paths accordingly dalam environment variables

## 📞 **Need Help?**

**Dany Pratmanto**  
📱 **WhatsApp:** [08974041777](https://wa.me/6208974041777?text=Halo%20Dany%2C%20saya%20butuh%20bantuan%20setup%20Android%20build%20di%20macOS)

> *Specialized dalam mobile app development dan Android build troubleshooting*

---

**Ready to build APK in 5 minutes! 🚀📱** 