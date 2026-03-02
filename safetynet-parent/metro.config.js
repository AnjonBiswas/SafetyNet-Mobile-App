// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Workaround for Windows colon directory name issue
const originalMkdir = require('fs/promises').mkdir;
require('fs/promises').mkdir = function (path, options) {
  // Replace 'node:sea' with 'node-sea' in path
  if (typeof path === 'string' && path.includes('node:sea')) {
    path = path.replace(/node:sea/g, 'node-sea');
  }
  return originalMkdir.call(this, path, options);
};

// Web platform resolver configuration
// This ensures react-native-web is used for web platform
config.resolver = {
  ...config.resolver,
  platforms: ['ios', 'android', 'native', 'web'],
  sourceExts: [...config.resolver.sourceExts, 'web.js', 'web.jsx', 'web.ts', 'web.tsx'],
  assetExts: config.resolver.assetExts.filter(ext => ext !== 'svg'),
  resolveRequest: (context, moduleName, platform) => {
    // Resolve react-native-maps to web stub on web platform
    if (platform === 'web' && moduleName === 'react-native-maps') {
      return {
        filePath: path.resolve(__dirname, 'src/utils/react-native-maps.web.js'),
        type: 'sourceFile',
      };
    }
    // Default resolution
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;


