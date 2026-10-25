import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';

// The plugin reads each worklet as TypeScript only by a `.ts` name, which Vite's `?v=` query hides.
const WORKLETS_OPTIONS = {
  extraPresets: [
    [
      createRequire(
        import.meta.resolve('react-native-worklets/plugin'),
      ).resolve('@babel/preset-typescript'),
      { allExtensions: true },
      'worklet-typescript',
    ],
  ],
};

// Victory's dist calls Reanimated hooks without dependency arrays, which only the Worklets Babel plugin fills in, so the web build reads the TypeScript source Metro reads and transpiles it with that plugin.
const VICTORY_SOURCE = realpathSync(
  `${import.meta.dirname}/../../../packages/kit/node_modules/victory-native/src/index.ts`,
);

const alias = { find: /^victory-native$/, replacement: VICTORY_SOURCE };

// Babel skips dependencies except Victory's source; pnpm's .pnpm folder hides it from modulesToTranspile.
const babelExclude = /\/node_modules\/(?!\.pnpm\/|victory-native\/)/;

export const victoryWeb = {
  alias,
  optimizeExclude: ['victory-native'],
  // Reanimated's Babel plugin, as Storybook's react-native-web-vite guide sets it; without it no derived value updates on web.
  pluginReactOptions: {
    exclude: babelExclude,
    babel: { plugins: [['react-native-worklets/plugin', WORKLETS_OPTIONS]] },
  },
};
