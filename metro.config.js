import { getDefaultConfig } from 'expo/metro-config';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

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

// Configure server port
config.server = {
  ...config.server,
  port: 8081,
};

export default config;
