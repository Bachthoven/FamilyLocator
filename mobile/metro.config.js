const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Use a different port
config.server = {
  port: 8082,
};

module.exports = config;