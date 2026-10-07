// Learn more https://docs.expo.io/guides/customizing-metro
const path = require('node:path');
// Metro-specific wrapper, not the generator's entry-swap one: Storybook renders in the (dev)/storybook route (ADR 0010).
const {
  withStorybook,
} = require('@storybook/react-native/metro/withStorybook');

const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Production bundles stub Storybook out; configPath must be absolute for the stub to match.
const storybookConfig = withStorybook(config, {
  enabled: process.env.NODE_ENV !== 'production',
  configPath: path.resolve(__dirname, '.rnstorybook'),
});

// Other wrappers go inside; withUniwindConfig must stay outermost.
module.exports = withUniwindConfig(storybookConfig, {
  cssEntryFile: './global.css',
  dtsFile: './src/uniwind-types.d.ts',
});
