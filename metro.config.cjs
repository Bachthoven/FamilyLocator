const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add SVG support if needed
if (!config.resolver.sourceExts.includes('svg')) {
  config.resolver.sourceExts.push('svg');
}

module.exports = config;
