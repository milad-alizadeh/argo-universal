import { fileURLToPath } from 'node:url';
import { build, type BuildOptions, type BuildResult } from 'esbuild';

let bundled: Promise<string> | null = null;

/*
 * The kit (React, the reconciler and the host config) runs inside each Plugin's context, so no object
 * from the worker's realm reaches Plugin code. It is bundled once per worker, from source.
 */
const options = {
  entryPoints: [fileURLToPath(new URL('./plugin-kit.ts', import.meta.url))],
  bundle: true,
  write: false,
  format: 'iife',
  platform: 'neutral',
  mainFields: ['module', 'main'],
  conditions: ['import', 'module', 'default'],
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'silent',
} satisfies BuildOptions;

function textOf(result: BuildResult<typeof options>): string {
  const output = result.outputFiles.at(0);

  if (!output) throw new Error('The Plugin kit did not build');

  return output.text;
}

export function bundleKit(): Promise<string> {
  bundled ??= build(options).then(textOf);

  return bundled;
}
