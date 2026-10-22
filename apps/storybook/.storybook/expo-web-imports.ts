interface ModuleRewrite {
  code: string;
  map: null;
}

const modulePathOf = (id: string): string | undefined => id.split('?')[0];

// These four imports only supply Expo's ambient namespace declarations; the built file keeps them as imports of modules that export nothing.
const declarationRewrites = [
  {
    file: '/expo-modules-core/src/ts-declarations/global.ts',
    pattern: /^import \{/gm,
    to: 'import type {',
  },
  {
    file: '/expo-modules-core/build/ts-declarations/global.js',
    pattern: /^import \{.*$/gm,
    to: '',
  },
];

export const expoDeclarationImports = {
  name: 'expo-declaration-imports',
  enforce: 'pre' as const,
  transform(code: string, id: string): ModuleRewrite | undefined {
    const rewrite = declarationRewrites.find(({ file }) =>
      modulePathOf(id)?.endsWith(file),
    );

    return rewrite === undefined
      ? undefined
      : { code: code.replaceAll(rewrite.pattern, rewrite.to), map: null };
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
  ...['400Regular', '300Light', '200ExtraLight'].map((weight) => ({
    file: `/@expo-google-fonts/material-symbols/${weight}/index.js`,
    from: `export const MaterialSymbols_${weight} = require('./MaterialSymbols_${weight}.ttf');`,
    to: `import font from './MaterialSymbols_${weight}.ttf?url';\nexport const MaterialSymbols_${weight} = font;`,
  })),
];

interface Rewrite {
  file: string;
  from: string;
  to: string;
}

interface WebImports {
  name: string;
  enforce: 'pre';
  transform(code: string, id: string): ModuleRewrite | undefined;
}

const webImports = (
  name: string,
  rewrites: readonly Rewrite[],
): WebImports => ({
  name,
  enforce: 'pre',
  transform(code: string, id: string): ModuleRewrite | undefined {
    const rewrite = rewrites.find(({ file }) =>
      modulePathOf(id)?.endsWith(file),
    );

    return rewrite === undefined
      ? undefined
      : { code: code.replace(rewrite.from, rewrite.to), map: null };
  },
});

export const expoSymbolsWebImports = webImports(
  'expo-symbols-web-imports',
  expoSymbolsRewrites,
);

// SvgTouchableMixin requires this native module inside a function, which the bundle hoists; the web never plays the touch sound.
export const reactNativeSvgWebImports = webImports(
  'react-native-svg-web-imports',
  [
    {
      file: '/react-native-svg/lib/module/fabric/NativeSvgSoundModule.js',
      from: "import { TurboModuleRegistry } from 'react-native';\nexport default TurboModuleRegistry.getEnforcing('RNSVGSoundModule');",
      to: 'export default { playTouchSound() {} };',
    },
  ],
);
