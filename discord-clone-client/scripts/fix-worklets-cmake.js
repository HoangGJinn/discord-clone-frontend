const fs = require('fs');
const path = require('path');

const cmakePath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-worklets',
  'android',
  'CMakeLists.txt',
);

const cleanupPaths = [
  path.join(__dirname, '..', 'node_modules', 'react-native-worklets', 'android', '.cxx'),
  path.join(__dirname, '..', 'node_modules', 'react-native-reanimated', 'android', '.cxx'),
  path.join(__dirname, '..', 'node_modules', 'expo-modules-core', 'android', '.cxx'),
];

try {
  if (!fs.existsSync(cmakePath)) {
    console.log('[fix-worklets-cmake] Skipped: CMakeLists.txt not found');
    process.exit(0);
  }

  const original = fs.readFileSync(cmakePath, 'utf8');
  const updated = original.replace(/\s+CONFIGURE_DEPENDS/g, '');

  if (updated === original) {
    console.log('[fix-worklets-cmake] No changes needed');
  }

  fs.writeFileSync(cmakePath, updated, 'utf8');
  console.log('[fix-worklets-cmake] Patched react-native-worklets/android/CMakeLists.txt');
} catch (error) {
  console.error('[fix-worklets-cmake] Failed:', error.message);
  process.exit(1);
}

for (const targetPath of cleanupPaths) {
  try {
    if (fs.existsSync(targetPath)) {
      fs.rmSync(targetPath, { recursive: true, force: true });
      console.log(`[fix-worklets-cmake] Removed ${targetPath}`);
    }
  } catch (error) {
    console.error(`[fix-worklets-cmake] Cleanup failed for ${targetPath}:`, error.message);
  }
}
