const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add SVG support to sourceExts
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

// Ensure proper module resolution
config.resolver.nodeModulesPaths = [
  './node_modules',
  './mobile/node_modules'
];

// Configure server to run on different port to avoid conflicts with Express
config.server = {
  ...config.server,
  port: 8081,
};

module.exports = config;
