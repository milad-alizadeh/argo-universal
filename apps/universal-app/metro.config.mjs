// Learn more https://docs.expo.io/guides/customizing-metro
import path from 'node:path';
// Metro-specific wrapper, not the generator's entry-swap one: Storybook renders in the (dev)/storybook route (ADR 0010).
import { withStorybook } from '@storybook/react-native/metro/withStorybook';
import { getDefaultConfig } from 'expo/metro-config.js';
import { withUniwindConfig } from 'uniwind/metro';

/** @import { MetroConfig } from 'expo/metro-config' */
/** @type {MetroConfig} */
const config = getDefaultConfig(import.meta.dirname);

// Production bundles stub Storybook out; configPath must be absolute for the stub to match.
const storybookConfig = withStorybook(config, {
  enabled: process.env.NODE_ENV !== 'production',
  configPath: path.resolve(import.meta.dirname, '.rnstorybook'),
});

// Other wrappers go inside; withUniwindConfig must stay outermost.
export default withUniwindConfig(storybookConfig, {
  cssEntryFile: './global.css',
  dtsFile: './src/uniwind-types.d.ts',
});
