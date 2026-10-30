import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/react-native-web-vite';
import tailwindcss from '@tailwindcss/vite';
import { uniwind } from 'uniwind/vite';
import {
  type DepOptimizationConfig,
  type InlineConfig,
  mergeConfig,
  type PluginOption,
} from 'vite';
import svgr from 'vite-plugin-svgr';
import { sfSymbolImages } from '../../../tools/sf-symbols/sf-symbol-images.mts';
import { storybookServerOptions } from '../../../tools/storybook-sync-port.js';
import {
  expoDeclarationImports,
  expoSymbolsWebImports,
  reactNativeSvgWebImports,
  reactNativeWorkletsWebImports,
  skiaAssetRegistry,
} from './expo-web-imports.ts';
import { victoryWeb } from './victory-web.ts';

function getAbsolutePath(value: string): string {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}

const PREBUNDLED_DEPENDENCIES = [
  'react-native-svg',
  '@repo/kit > @radix-ui/react-popover',
  '@repo/kit > @radix-ui/react-dialog',
  '@repo/client > react-native > invariant',
  '@repo/kit > @radix-ui/react-collapsible',
  '@repo/kit > @radix-ui/react-select',
  '@repo/kit > @radix-ui/react-dropdown-menu',
  '@repo/kit > @gorhom/portal',
  '@repo/client > @tanstack/react-form',
  '@repo/kit > burnt',
  '@repo/kit > burnt/web',
  '@repo/kit > @legendapp/list/react-native',
  '@repo/kit > react-native-keyboard-controller',
  '@repo/kit > expo-haptics',
  '@repo/client > expo-document-picker',
  '@repo/client > expo-image-picker',
  '@repo/kit > expo-symbols',
  '@repo/kit > expo-audio',
  '@repo/kit > expo-symbols/androidWeights/extraLight',
  '@repo/kit > victory-native > react-fast-compare',
  'storybook/actions',
];

// Dependency files Metro reads one way and the web build another; both the server and the dependency pre-bundle need them.
const WEB_IMPORT_REWRITES = [
  expoDeclarationImports,
  expoSymbolsWebImports,
  reactNativeSvgWebImports,
  reactNativeWorkletsWebImports,
];

const PRIMITIVES_FOLDER = `${import.meta.dirname}/../../../packages/kit/src/primitives`;

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

const ASSET_REGISTRY = `${getAbsolutePath('react-native-web')}/dist/modules/AssetRegistry/index.js`;

const VITE_RESOLVE = {
  // #primitives/<group>/<name> is that folder's index, as in @repo/kit's imports map.
  alias: [
    {
      find: /^#primitives\/(.+)$/,
      replacement: `${PRIMITIVES_FOLDER}/$1/index.ts`,
    },
    // React Native 0.87 stopped shipping this package, which react-native-svg's web build still imports.
    {
      find: '@react-native/assets-registry/registry',
      replacement: ASSET_REGISTRY,
    },
    victoryWeb.alias,
  ],
  extensions: RESOLVED_EXTENSIONS,
};

const vitePlugins = (): PluginOption[] => [
  skiaAssetRegistry(ASSET_REGISTRY),
  ...WEB_IMPORT_REWRITES,
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

const OPTIMIZE_DEPS: DepOptimizationConfig = {
  include: PREBUNDLED_DEPENDENCIES,
  exclude: victoryWeb.optimizeExclude,
  rolldownOptions: {
    plugins: WEB_IMPORT_REWRITES,
    moduleTypes: { '.ts': 'ts' },
  },
};

const viteOverrides = (): InlineConfig => ({
  // Resolve public font URLs during CSS compilation; staticDirs copies the files.
  publicDir: `${import.meta.dirname}/../../universal-app/public`,
  build: { copyPublicDir: false },
  optimizeDeps: OPTIMIZE_DEPS,
  resolve: VITE_RESOLVE,
  plugins: vitePlugins(),
});

/*
 * Uniwind styles the screens, so every Vite build of this Storybook goes through here: the dev
 * server and the Vitest addon as `viteFinal`, and the render gates' own Vitest project directly.
 */
export const storybookVite = (config: InlineConfig): InlineConfig =>
  mergeConfig(config, viteOverrides());

type Config = StorybookConfig &
  Record<'reactNativeServerOptions', ReturnType<typeof storybookServerOptions>>;

const config: Config = {
  staticDirs: [
    { from: '../../universal-app/public/fonts', to: '/fonts' },
    {
      from: '../../universal-app/public/canvaskit.wasm',
      to: '/canvaskit.wasm',
    },
  ],
  // Screens live in @repo/client and the kit in @repo/kit (ADR 0009); globs resolve from this .storybook folder.
  stories: process.env.VITEST
    ? [
        '../../../packages/client/src/**/*.stories.tsx',
        '../../../packages/kit/src/**/*.stories.tsx',
      ]
    : [
        '../../../packages/client/src/**/!(*.test).stories.tsx',
        '../../../packages/kit/src/**/!(*.test).stories.tsx',
      ],
  addons: [
    getAbsolutePath('@chromatic-com/storybook'),
    getAbsolutePath('@storybook/addon-vitest'),
    getAbsolutePath('@storybook/addon-a11y'),
    getAbsolutePath('@storybook/addon-docs'),
    getAbsolutePath('@storybook/addon-react-native-server'),
  ],
  reactNativeServerOptions: storybookServerOptions(),
  typescript: { reactDocgen: 'react-docgen' },
  framework: {
    name: getAbsolutePath('@storybook/react-native-web-vite'),
    options: {
      pluginReactOptions: victoryWeb.pluginReactOptions,
    },
  },
  viteFinal: storybookVite,
};

export default config;
