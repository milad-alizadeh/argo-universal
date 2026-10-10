import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/react-native-web-vite';
import tailwindcss from '@tailwindcss/vite';
import { uniwind } from 'uniwind/vite';
import { mergeConfig } from 'vite';
import { sfSymbolImages } from '../../../tools/sf-symbols/sf-symbol-images.mts';

function getAbsolutePath(value: string): string {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}
const config: StorybookConfig = {
  staticDirs: [{ from: '../../universal-app/public/fonts', to: '/fonts' }],
  // Screens live in @repo/client (ADR 0009); globs resolve from this .storybook folder.
  stories: process.env.VITEST
    ? ['../../../packages/client/src/**/*.stories.tsx']
    : ['../../../packages/client/src/**/!(*.test).stories.tsx'],
  addons: [
    getAbsolutePath('@chromatic-com/storybook'),
    getAbsolutePath('@storybook/addon-vitest'),
    getAbsolutePath('@storybook/addon-docs'),
  ],
  typescript: { reactDocgen: false },
  framework: getAbsolutePath('@storybook/react-native-web-vite'),
  // Uniwind styles the screens; the Vitest addon reuses this hook.
  viteFinal(config) {
    const expoDeclarationImports = {
      name: 'expo-declaration-imports',
      enforce: 'pre' as const,
      transform(
        code: string,
        id: string,
      ): { code: string; map: null } | undefined {
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
    // Metro allows both of these; strict ESM does not.
    const expoSymbolsRewrites = [
      // React Native Web has no PlatformColor, which SymbolView reads only on Android.
      {
        file: '/expo-symbols/build/SymbolView.js',
        from: 'import { Platform, PlatformColor, Text, View }',
        to: 'const PlatformColor = undefined;\nimport { Platform, Text, View }',
      },
      // A required font would become a module object; expo-font needs its URL.
      ...['400Regular', '200ExtraLight'].map((weight) => ({
        file: `/@expo-google-fonts/material-symbols/${weight}/index.js`,
        from: `export const MaterialSymbols_${weight} = require('./MaterialSymbols_${weight}.ttf');`,
        to: `import font from './MaterialSymbols_${weight}.ttf?url';\nexport const MaterialSymbols_${weight} = font;`,
      })),
    ];
    const expoSymbolsWebImports = {
      name: 'expo-symbols-web-imports',
      enforce: 'pre' as const,
      transform(
        code: string,
        id: string,
      ): { code: string; map: null } | undefined {
        const rewrite = expoSymbolsRewrites.find(({ file }) =>
          id.split('?')[0]?.endsWith(file),
        );
        if (rewrite)
          return { code: code.replace(rewrite.from, rewrite.to), map: null };
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
          '@repo/client > @rn-primitives/checkbox',
          '@repo/client > @rn-primitives/select',
          '@repo/client > @tanstack/react-form',
          '@repo/client > ajv',
          '@repo/client > ajv-formats',
          '@repo/client > @legendapp/list/react-native',
          '@repo/client > react-native-keyboard-controller',
          '@repo/client > expo-haptics',
          '@repo/client > expo-image-picker',
          '@repo/client > expo-symbols',
          '@repo/client > expo-symbols/androidWeights/extraLight',
          '@repo/client > react-native-drawer-layout',
          'storybook/actions',
        ],
        rolldownOptions: {
          plugins: [expoDeclarationImports, expoSymbolsWebImports],
          moduleTypes: { '.ts': 'ts' },
        },
      },
      resolve: {
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
        expoSymbolsWebImports,
        sfSymbolImages,
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
