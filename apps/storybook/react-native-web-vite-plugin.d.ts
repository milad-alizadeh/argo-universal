/* The framework ships this subpath without types; `storybookReactNativeWeb` is all it exports. */
declare module '@storybook/react-native-web-vite/vite-plugin' {
  import type { PluginOption } from 'vite';

  export const storybookReactNativeWeb: () => PluginOption[];
}
