import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/react-native-web-vite';
import tailwindcss from '@tailwindcss/vite';
import { uniwind } from 'uniwind/vite';
import { mergeConfig, type PluginOption } from 'vite';
import svgr from 'vite-plugin-svgr';
import { sfSymbolImages } from '../../../tools/sf-symbols/sf-symbol-images.mts';
import {
  expoDeclarationImports,
  expoSymbolsWebImports,
} from './expo-web-imports.ts';

function getAbsolutePath(value: string): string {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}

const PREBUNDLED_DEPENDENCIES = [
  'react-native-svg',
  '@repo/client > @radix-ui/react-popover',
  '@repo/client > @radix-ui/react-dialog',
  '@repo/client > react-native > invariant',
  '@repo/client > @radix-ui/react-collapsible',
  '@repo/client > @radix-ui/react-select',
  '@repo/client > @radix-ui/react-dropdown-menu',
  '@repo/client > @gorhom/portal',
  '@repo/client > @tanstack/react-form',
  '@repo/client > ajv',
  '@repo/client > ajv-formats',
  '@repo/client > burnt',
  '@repo/client > burnt/web',
  '@repo/client > @legendapp/list/react-native',
  '@repo/client > react-native-keyboard-controller',
  '@repo/client > expo-haptics',
  '@repo/client > expo-document-picker',
  '@repo/client > expo-image-picker',
  '@repo/client > expo-symbols',
  '@repo/client > expo-audio',
  '@repo/client > expo-symbols/androidWeights/extraLight',
  'storybook/actions',
];

const PRIMITIVES_FOLDER = `${import.meta.dirname}/../../../packages/client/src/lib/generic/primitives`;

const RESOLVED_EXTENSIONS = [
  '.web.tsx',
  '.web.ts',
  '.web.jsx',
  '.web.js',
  '.mjs',
  '.js',
  '.ts',
  '.tsx',
  '.json',
];

const VITE_RESOLVE = {
  // #primitives/<group>/<name> is that folder's index, as in @repo/client's imports map.
  alias: [
    {
      find: /^#primitives\/(.+)$/,
      replacement: `${PRIMITIVES_FOLDER}/$1/index.ts`,
    },
  ],
  extensions: RESOLVED_EXTENSIONS,
};

const vitePlugins = (): PluginOption[] => [
  expoDeclarationImports,
  expoSymbolsWebImports,
  sfSymbolImages,
  // A logo SVG imports as a react-native-svg component, as Metro's react-native-svg-transformer gives the app (ADR-0019).
  svgr({ include: '**/*.svg', svgrOptions: { native: true } }),
  tailwindcss(),
  // Uniwind resolves these from process.cwd(), so they are absolute.
  uniwind({
    cssEntryFile: `${import.meta.dirname}/../global.css`,
    dtsFile: `${import.meta.dirname}/../uniwind-types.d.ts`,
  }),
];

const config: StorybookConfig & {
  reactNativeServerOptions: { host: string; port: number };
} = {
  staticDirs: [
    { from: '../../universal-app/public/fonts', to: '/fonts' },
    {
      from: '../../universal-app/public/canvaskit.wasm',
      to: '/canvaskit.wasm',
    },
  ],
  // Screens live in @repo/client (ADR 0009); globs resolve from this .storybook folder.
  stories: process.env.VITEST
    ? ['../../../packages/client/src/**/*.stories.tsx']
    : ['../../../packages/client/src/**/!(*.test).stories.tsx'],
  addons: [
    getAbsolutePath('@chromatic-com/storybook'),
    getAbsolutePath('@storybook/addon-vitest'),
    getAbsolutePath('@storybook/addon-docs'),
    getAbsolutePath('@storybook/addon-react-native-server'),
  ],
  reactNativeServerOptions: { host: '127.0.0.1', port: 7007 },
  typescript: { reactDocgen: 'react-docgen' },
  framework: getAbsolutePath('@storybook/react-native-web-vite'),
  // Uniwind styles the screens; the Vitest addon reuses this hook.
  viteFinal(config) {
    return mergeConfig(config, {
      // Resolve public font URLs during CSS compilation; staticDirs copies the files.
      publicDir: `${import.meta.dirname}/../../universal-app/public`,
      build: { copyPublicDir: false },
      optimizeDeps: {
        include: PREBUNDLED_DEPENDENCIES,
        rolldownOptions: {
          plugins: [expoDeclarationImports, expoSymbolsWebImports],
          moduleTypes: { '.ts': 'ts' },
        },
      },
      resolve: VITE_RESOLVE,
      plugins: vitePlugins(),
    });
  },
};

export default config;
