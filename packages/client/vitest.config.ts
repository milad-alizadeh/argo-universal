import { fileURLToPath } from 'node:url';
import { createNodeTestProjects } from '@repo/vitest/node';
import { defineProject } from 'vitest/config';

// These run as a phone does: the channel's cipher is `aead.native.ts`, over `node:crypto` standing in for react-native-quick-crypto, which has the same surface.
const native = ['src/**/aead.native.test.ts', 'src/**/*.vector.test.ts'];

const nativeCipher = fileURLToPath(
  new URL(
    'src/features/connection/api/channel/aead.native.ts',
    import.meta.url,
  ),
);

const nodeQuickCrypto = fileURLToPath(
  new URL('mocks/quick-crypto-node.ts', import.meta.url),
);

// Node projects cover non-UI code; the Storybook browser project covers stories.
export default defineProject({
  test: {
    projects: [
      ...createNodeTestProjects({
        include: ['src/**/*.test.ts', 'mocks/**/*.test.ts'],
        exclude: ['src/**/aead.native.test.ts'],
      }),
      {
        extends: false,
        resolve: {
          alias: [
            { find: 'react-native-quick-crypto', replacement: nodeQuickCrypto },
            { find: /^\.\/aead$/, replacement: nativeCipher },
          ],
        },
        test: {
          name: 'native-cipher',
          environment: 'node',
          restoreMocks: true,
          expect: { requireAssertions: true },
          include: native,
        },
      },
    ],
  },
});
