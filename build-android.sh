#!/bin/bash

# 📱 Multi-Process TTS App - Android Build Script
# Author: Dany Pratmanto (08974041777)
# Usage: ./build-android.sh [debug|release]

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# App Information
APP_NAME="Multi-Process TTS"
PACKAGE_ID="com.danypratmanto.tts"
VERSION="1.0.0"

echo -e "${BLUE}🚀 Building ${APP_NAME} v${VERSION} for Android${NC}"
echo -e "${BLUE}📱 Package ID: ${PACKAGE_ID}${NC}"
echo -e "${BLUE}👨‍💻 Developer: Dany Pratmanto (WhatsApp: 08974041777)${NC}"
echo ""

# Get build type (default: debug)
BUILD_TYPE=${1:-debug}

if [[ "$BUILD_TYPE" != "debug" && "$BUILD_TYPE" != "release" ]]; then
    echo -e "${RED}❌ Invalid build type. Use 'debug' or 'release'${NC}"
    echo "Usage: ./build-android.sh [debug|release]"
    exit 1
fi

echo -e "${YELLOW}📋 Build Configuration:${NC}"
echo "   Build Type: $BUILD_TYPE"
echo "   Output: android/app/build/outputs/apk/$BUILD_TYPE/"
echo ""

# Step 1: Clean previous builds
echo -e "${BLUE}🧹 Step 1: Cleaning previous builds...${NC}"
if [ -d "dist" ]; then
    rm -rf dist
    echo "   ✅ Cleaned dist folder"
fi

if [ -d "android/app/build" ]; then
    rm -rf android/app/build
    echo "   ✅ Cleaned Android build folder"
fi

# Step 2: Install dependencies (if needed)
echo -e "${BLUE}📦 Step 2: Checking dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    echo "   Installing dependencies..."
    npm install
    echo "   ✅ Dependencies installed"
else
    echo "   ✅ Dependencies already installed"
fi

# Step 3: Build React app
echo -e "${BLUE}⚛️ Step 3: Building React application...${NC}"
npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Build failed - dist folder not created${NC}"
    exit 1
fi

echo "   ✅ React app built successfully"
echo "   📊 Build size: $(du -sh dist | cut -f1)"

# Step 4: Sync Capacitor
echo -e "${BLUE}🔄 Step 4: Syncing Capacitor to Android...${NC}"
npx cap sync android

echo "   ✅ Capacitor synced successfully"

# Step 5: Build Android APK
echo -e "${BLUE}🤖 Step 5: Building Android APK ($BUILD_TYPE)...${NC}"

cd android

if [ "$BUILD_TYPE" = "debug" ]; then
    echo "   Building debug APK..."
    ./gradlew assembleDebug
    APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
else
    echo "   Building release APK..."
    echo -e "${YELLOW}⚠️ Note: Release build requires keystore configuration${NC}"
    ./gradlew assembleRelease
    APK_PATH="app/build/outputs/apk/release/app-release.apk"
fi

cd ..

# Step 6: Verify APK creation
echo -e "${BLUE}✅ Step 6: Verifying APK creation...${NC}"

FULL_APK_PATH="android/$APK_PATH"

if [ -f "$FULL_APK_PATH" ]; then
    APK_SIZE=$(du -sh "$FULL_APK_PATH" | cut -f1)
    echo -e "${GREEN}🎉 APK created successfully!${NC}"
    echo ""
    echo -e "${GREEN}📱 APK Details:${NC}"
    echo "   File: $FULL_APK_PATH"
    echo "   Size: $APK_SIZE"
    echo "   Type: $BUILD_TYPE"
    echo "   Package: $PACKAGE_ID"
    echo ""
    
    # Optional: Install APK if device connected
    if command -v adb &> /dev/null; then
        ADB_DEVICES=$(adb devices | grep -v "List of devices" | grep "device" | wc -l)
        if [ $ADB_DEVICES -gt 0 ]; then
            echo -e "${YELLOW}📱 Android device detected. Install APK? (y/n):${NC}"
            read -r INSTALL_CHOICE
            if [[ "$INSTALL_CHOICE" = "y" || "$INSTALL_CHOICE" = "Y" ]]; then
                echo "   Installing APK..."
                adb install -r "$FULL_APK_PATH"
                echo -e "${GREEN}   ✅ APK installed successfully${NC}"
            fi
        else
            echo -e "${YELLOW}💡 Connect Android device and run:${NC}"
            echo "   adb install $FULL_APK_PATH"
        fi
    else
        echo -e "${YELLOW}💡 To install APK on device:${NC}"
        echo "   1. Enable Developer Options & USB Debugging"
        echo "   2. Connect device via USB"
        echo "   3. Run: adb install $FULL_APK_PATH"
    fi
    
    echo ""
    echo -e "${GREEN}🚀 Build completed successfully!${NC}"
    echo -e "${BLUE}📞 Need help? Contact Dany Pratmanto: https://wa.me/6208974041777${NC}"
    
else
    echo -e "${RED}❌ APK creation failed${NC}"
    echo "Check the build logs for errors"
    exit 1
fi

# Step 7: Build summary
echo ""
echo -e "${BLUE}📊 Build Summary:${NC}"
echo "   ✅ React app: Built successfully"
echo "   ✅ Capacitor: Synced successfully"
echo "   ✅ Android APK: Created successfully"
echo "   📱 APK Size: $APK_SIZE"
echo "   📍 Location: $FULL_APK_PATH"
echo ""
echo -e "${GREEN}Ready for distribution! 🚀${NC}" 