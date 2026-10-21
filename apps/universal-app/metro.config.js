// Learn more https://docs.expo.io/guides/customizing-metro
const path = require('node:path');

// Metro-specific wrapper, not the generator's entry-swap one: Storybook renders in the (dev)/storybook route (ADR 0010).
const {
  withStorybook,
} = require('@storybook/react-native/metro/withStorybook');

const { getDefaultConfig } = require('expo/metro-config');

const { withUniwindConfig } = require('uniwind/metro');

/** @import { MetroConfig } from 'expo/metro-config' */
/** @type {MetroConfig} */
const config = getDefaultConfig(__dirname);

// #primitives/<group>/<name> is that folder's index; its extensionless relative imports let Metro choose each platform's drawing.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const primitivePath = moduleName.startsWith('#primitives/')
    ? path.resolve(
        __dirname,
        '../../packages/kit/src/primitives',
        moduleName.slice('#primitives/'.length),
        'index',
      )
    : moduleName;

  return context.resolveRequest(context, primitivePath, platform);
};

// A logo SVG imports as a react-native-svg component on every platform, so `Icon` draws it with one renderer (ADR-0019).
config.transformer.babelTransformerPath =
  require.resolve('react-native-svg-transformer/expo');

config.resolver.assetExts = config.resolver.assetExts.filter(
  (extension) => extension !== 'svg',
);

config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

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
