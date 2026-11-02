import { fileURLToPath } from 'node:url';
import { build, type BuildOptions, type BuildResult } from 'esbuild';

let bundled: Promise<string> | null = null;

/*
 * The kit (React, the reconciler and the host config) and the Plugin API run inside each Plugin's
 * context, so no object from the worker's realm reaches Plugin code. They are bundled once per
 * worker, from source.
 */
const options = {
  entryPoints: [
    fileURLToPath(new URL('../worker/plugin-api.ts', import.meta.url)),
  ],
  bundle: true,
  write: false,
  format: 'iife',
  platform: 'neutral',
  mainFields: ['module', 'main'],
  conditions: ['import', 'module', 'default'],
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'silent',
} satisfies BuildOptions;

function textOf(result: BuildResult<{ write: false }>): string {
  const output = result.outputFiles.at(0);

  if (!output) throw new Error('The Plugin kit did not build');

  return output.text;
}

const patternDirectory = fileURLToPath(
  new URL('../../../../plugin-kit/sign-in', import.meta.url),
);

const patternOptions = {
  entryPoints: ['index.ts'],
  absWorkingDir: patternDirectory,
  bundle: true,
  write: false,
  metafile: true,
  format: 'esm',
  platform: 'neutral',
  external: ['@argo/plugin-kit', '@argo/plugin-kit/*'],
  jsx: 'automatic',
  jsxImportSource: '@argo/plugin-kit',
  logLevel: 'silent',
} satisfies BuildOptions;

// Nothing outside its folder but the kit's public API may reach the pattern's bundle.
function requireOnlyKit(inputs: string[]): void {
  const outside = inputs.find((input) => input.startsWith('..'));

  if (outside)
    throw new Error(
      `@argo/plugin-kit/sign-in may import only @argo/plugin-kit, not ${outside}`,
    );
}

// A Plugin's build, with that one thing more.
async function buildPattern(): Promise<string> {
  const result = await build(patternOptions);

  requireOnlyKit(Object.keys(result.metafile.inputs));

  return textOf(result);
}

let signIn: Promise<string> | null = null;

// `@argo/plugin-kit/sign-in`, which runs in a Plugin's context as the Plugin's own code does.
export function bundleSignIn(): Promise<string> {
  signIn ??= buildPattern();

  return signIn;
}

export function bundleKit(): Promise<string> {
  bundled ??= build(options).then(textOf);

  return bundled;
}
