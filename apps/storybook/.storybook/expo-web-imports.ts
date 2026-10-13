interface ModuleRewrite {
  code: string;
  map: null;
}

const modulePathOf = (id: string): string | undefined => id.split('?')[0];

export const expoDeclarationImports = {
  name: 'expo-declaration-imports',
  enforce: 'pre' as const,
  transform(code: string, id: string): ModuleRewrite | undefined {
    // These four imports only supply Expo's ambient namespace declarations.
    if (
      modulePathOf(id)?.endsWith(
        '/expo-modules-core/src/ts-declarations/global.ts',
      )
    )
      return {
        code: code.replaceAll(/^import \{/gm, 'import type {'),
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

export const expoSymbolsWebImports = {
  name: 'expo-symbols-web-imports',
  enforce: 'pre' as const,
  transform(code: string, id: string): ModuleRewrite | undefined {
    const rewrite = expoSymbolsRewrites.find(({ file }) =>
      modulePathOf(id)?.endsWith(file),
    );
    if (rewrite)
      return { code: code.replace(rewrite.from, rewrite.to), map: null };
  },
};
