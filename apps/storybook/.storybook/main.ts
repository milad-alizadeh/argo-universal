import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/react-native-web-vite';

function getAbsolutePath(value: string) {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}
const config: StorybookConfig = {
  staticDirs: [{ from: '../../universal-app/public/fonts', to: '/fonts' }],
  // Screens live in @repo/client (ADR 0009); globs resolve from this .storybook folder.
  stories: ['../../../packages/client/src/**/*.stories.tsx'],
  addons: [
    getAbsolutePath('@chromatic-com/storybook'),
    getAbsolutePath('@storybook/addon-vitest'),
    getAbsolutePath('@storybook/addon-docs'),
  ],
  typescript: { reactDocgen: false },
  framework: getAbsolutePath('@storybook/react-native-web-vite'),
  // Uniwind styles the screens (spec section 9); the Vitest addon reuses this hook.
  async viteFinal(config) {
    const { mergeConfig } = await import('vite');
    const { default: tailwindcss } = await import('@tailwindcss/vite');
    const { uniwind } = await import('uniwind/vite');
    const expoDeclarationImports = {
      name: 'expo-declaration-imports',
      enforce: 'pre' as const,
      transform(code: string, id: string) {
        // These four imports only supply Expo's ambient namespace declarations.
        if (
          id
            .split('?')[0]
            ?.endsWith('/expo-modules-core/src/ts-declarations/global.ts')
        )
          return {
            code: code.replace(/^import \{/gm, 'import type {'),
            map: null,
          };
      },
    };
    return mergeConfig(config, {
      // Resolve public font URLs during CSS compilation; staticDirs copies the files.
      publicDir: `${import.meta.dirname}/../../universal-app/public`,
      build: { copyPublicDir: false },
      optimizeDeps: {
        include: [
          'react-native-svg',
          '@repo/client > @rn-primitives/collapsible',
          '@repo/client > @legendapp/list',
          '@repo/client > expo-haptics',
          '@repo/client > expo-image-picker',
          '@repo/client > react-native-drawer-layout',
          'storybook/actions',
        ],
        rolldownOptions: {
          plugins: [expoDeclarationImports],
          moduleTypes: { '.ts': 'ts' },
        },
      },
      resolve: {
        alias: {
          // Uniwind's web shim omits the ESM entry's unstable_batchedUpdates export.
          '@legendapp/list': createRequire(
            import.meta.resolve('@repo/client'),
          ).resolve('@legendapp/list'),
        },
        extensions: [
          '.web.tsx',
          '.web.ts',
          '.web.jsx',
          '.web.js',
          '.mjs',
          '.js',
          '.ts',
          '.tsx',
          '.json',
        ],
      },
      plugins: [
        expoDeclarationImports,
        tailwindcss(),
        // Uniwind resolves these from process.cwd(), so they are absolute.
        uniwind({
          cssEntryFile: `${import.meta.dirname}/../global.css`,
          dtsFile: `${import.meta.dirname}/../uniwind-types.d.ts`,
        }),
      ],
    });
  },
};
export default config;
