const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Exclude only native build artifacts that cause EPERM errors on Windows
// but keep JS build directories that might be needed by packages.
config.resolver.blockList = [
  // Exclude native build directories (Windows & Unix compatible)
  /.*[/\\]android[/\\]build[/\\]?.*/,
  /.*[/\\]android[/\\]\.cxx[/\\]?.*/,
  /.*[/\\]ios[/\\]build[/\\]?.*/,
  
  // Specific gradle plugins that are definitely not JS
  /node_modules[/\\]@react-native[/\\]gradle-plugin[/\\]?.*/,
  /node_modules[/\\]expo-modules-autolinking[/\\]android[/\\]expo-gradle-plugin[/\\]?.*/,
];

// Reduce workers to avoid out-of-memory or SIGTERM issues on Windows
config.maxWorkers = 2;

module.exports = config;
