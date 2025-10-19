import { getDefaultConfig } from 'expo/metro-config.js';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = getDefaultConfig(__dirname);

// Add SVG support
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

// Ensure proper module resolution
config.resolver.nodeModulesPaths = [
  './node_modules',
  './mobile/node_modules'
];

// Fix asset registry path for React Native 0.81
config.transformer = {
  ...config.transformer,
  assetRegistryPath: resolve(__dirname, 'node_modules/@react-native/assets-registry/registry.js'),
};

// Configure server port
config.server = {
  ...config.server,
  port: 8081,
};

export default config;
