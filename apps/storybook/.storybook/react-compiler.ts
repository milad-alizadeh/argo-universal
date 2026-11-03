import { fileURLToPath } from 'node:url';

// Argo's own code, as babel-preset-expo compiles it in the App; dependencies stay as they ship.
const ownCode = (file: string): boolean => !file.includes('/node_modules/');

const plugin = [
  fileURLToPath(import.meta.resolve('babel-plugin-react-compiler')),
  { target: '19', sources: ownCode },
];

// What the compiler's output imports, which the dependency pre-bundle holds before the first story loads.
export const reactCompilerRuntime = 'react/compiler-runtime';

interface ReactOptions {
  babel: { plugins: unknown[] };
}

/*
 * The App compiles with the React Compiler that babel-preset-expo runs, so Storybook does too and render counts
 * measure what ships. It runs before every other Babel plugin, as the compiler requires.
 */
export const withReactCompiler = <Options extends ReactOptions>(
  options: Options,
): Options => ({
  ...options,
  babel: { ...options.babel, plugins: [plugin, ...options.babel.plugins] },
});
