// Metro configuration.
//
// Extends Expo's default config and relocates Metro's (potentially large)
// transform cache off the space-constrained C: drive onto D:. Everything else
// is Expo's default (platform extensions, tsconfig `paths`, asset handling).
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { FileStore } = require("metro-cache");

const config = getDefaultConfig(__dirname);

config.cacheStores = [
  new FileStore({ root: path.join("D:", "ml-cache", "metro", "travelpia") }),
];

module.exports = config;
