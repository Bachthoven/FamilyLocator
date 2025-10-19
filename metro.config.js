import { getDefaultConfig } from 'expo/metro-config.js';

const config = getDefaultConfig(import.meta.dirname || process.cwd());

// Configure Metro to handle TypeScript and React Native
config.resolver.sourceExts = [...config.resolver.sourceExts, 'ts', 'tsx'];
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'svg');
config.resolver.sourceExts.push('svg');

// Ensure proper module resolution
config.resolver.nodeModulesPaths = [
  './node_modules',
  './mobile/node_modules'
];

// Configure transformer with asset registry path
config.transformer = {
  ...config.transformer,
  assetRegistryPath: '@react-native/assets-registry/registry',
};

// Configure server to run on different port to avoid conflicts with Express
config.server = {
  ...config.server,
  port: 8081,
};

// Handle backend requests separately
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    // Pass through API requests to the backend
    if (req.url.startsWith('/api')) {
      return next();
    }
    return middleware(req, res, next);
  };
};

export default config;