#!/usr/bin/env bash
# One-shot build script: bundles the web app and syncs it into both native projects.
# Run this whenever you want to test on device or prepare a release.
set -e

echo "🔨 Building web bundle..."
npm run build

echo ""
echo "📱 Syncing Android..."
if [ -d "android" ]; then
  npx cap sync android
else
  echo "   (Android platform not added yet — run: npx cap add android)"
fi

echo ""
echo "🍎 Syncing iOS..."
if [ -d "ios" ]; then
  npx cap sync ios
else
  echo "   (iOS platform not added yet — run: npx cap add ios)"
fi

echo ""
echo "✨ Done. Open projects with:"
echo "   npx cap open android"
echo "   npx cap open ios"
