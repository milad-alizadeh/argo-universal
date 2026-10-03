import type { StorybookConfig } from '@storybook/react-native-web-vite';

import { dirname } from 'path';

import { fileURLToPath } from 'url';

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
function getAbsolutePath(value: string) {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}
const config: StorybookConfig = {
  // Screens live in @repo/client (ADR 0009); globs resolve from this .storybook folder.
  stories: ['../../../packages/client/src/**/*.stories.tsx'],
  addons: [
    getAbsolutePath('@chromatic-com/storybook'),
    getAbsolutePath('@storybook/addon-vitest'),
    getAbsolutePath('@storybook/addon-docs'),
  ],
  framework: getAbsolutePath('@storybook/react-native-web-vite'),
  // Uniwind styles the screens (spec section 9); the Vitest addon reuses this hook.
  async viteFinal(config) {
    const { mergeConfig } = await import('vite');
    const { default: tailwindcss } = await import('@tailwindcss/vite');
    const { uniwind } = await import('uniwind/vite');
    return mergeConfig(config, {
      plugins: [
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
