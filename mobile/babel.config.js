module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo (SDK 50+) includes the expo-router transform,
    // reanimated support, and tsconfig `paths` resolution.
    presets: ["babel-preset-expo"],
  };
};
