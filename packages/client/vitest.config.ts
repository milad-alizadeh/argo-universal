import { fileURLToPath } from 'node:url';
import {
  createNodeTestProjects,
  createResolvedUnitProject,
} from '@repo/vitest/node';
import { defineProject } from 'vitest/config';

// These run as a phone does: Metro takes `aead.native.ts` for `./aead`, and `node:crypto` stands in for react-native-quick-crypto, which has the same surface.
const native = [
  'src/**/aead.native.test.ts',
  'src/**/media-store.native.test.ts',
  'src/**/*.vector.test.ts',
];

const nodeQuickCrypto = fileURLToPath(
  new URL('mocks/quick-crypto-node.ts', import.meta.url),
);

// Node projects cover non-UI code; the Storybook browser project covers stories.
export default defineProject({
  test: {
    projects: [
      ...createNodeTestProjects({
        include: ['src/**/*.test.ts', 'mocks/**/*.test.ts'],
        exclude: [
          'src/**/aead.native.test.ts',
          'src/**/media-store.native.test.ts',
        ],
      }),
      createResolvedUnitProject({
        name: 'native-cipher',
        include: native,
        resolve: {
          extensions: ['.native.ts', '.ts', '.tsx', '.mjs', '.js', '.json'],
          alias: { 'react-native-quick-crypto': nodeQuickCrypto },
        },
      }),
    ],
  },
});
