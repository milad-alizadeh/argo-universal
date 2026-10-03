import { type Plugin, transformWithOxc } from 'vite';
import { defineProject } from 'vitest/config';

// @rn-primitives ships JSX in .mjs files, which Metro compiles but Vite does not.
const jsxInPrimitives: Plugin = {
  name: 'jsx-in-primitives',
  enforce: 'pre',
  transform(code, id) {
    if (!/\/@rn-primitives\/.+\.m?js$/.test(id)) return;
    return transformWithOxc(code, id, {
      lang: 'jsx',
      jsx: { runtime: 'automatic' },
    });
  },
};

export default defineProject({
  plugins: [jsxInPrimitives],
  // Screens render through React Native Web in jsdom, as they do in the web App.
  resolve: { alias: { 'react-native': 'react-native-web' } },
  test: {
    environment: 'jsdom',
    // Dependencies that import react-native must go through the alias above.
    server: { deps: { inline: [/@rn-primitives/] } },
  },
});
