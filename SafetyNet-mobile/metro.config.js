// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Fix for packages (e.g. axios) that may resolve to Node builds (crypto/http/etc).
// We force Metro to prefer the browser/react-native conditions.
config.resolver = config.resolver ?? {};
config.resolver.unstable_conditionNames = ['browser', 'react-native', 'require'];

module.exports = config;

