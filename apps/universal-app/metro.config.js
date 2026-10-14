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
        '../../packages/client/src/lib/generic/primitives',
        moduleName.slice('#primitives/'.length),
        'index',
      )
    : moduleName;

  return context.resolveRequest(context, primitivePath, platform);
};

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
