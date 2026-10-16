import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

let bundled: Promise<string> | null = null;

/*
 * The kit (React, the reconciler and the host config) runs inside each Plugin's context, so no object
 * from the worker's realm reaches Plugin code. It is bundled once per worker, from source.
 */
export function bundleKit(): Promise<string> {
  bundled ??= build({
    entryPoints: [fileURLToPath(new URL('./plugin-kit.ts', import.meta.url))],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'neutral',
    mainFields: ['module', 'main'],
    conditions: ['import', 'module', 'default'],
    define: { 'process.env.NODE_ENV': '"production"' },
    logLevel: 'silent',
  }).then((result) => {
    const output = result.outputFiles.at(0);

    if (!output) throw new Error('The Plugin kit did not build');

    return output.text;
  });

  return bundled;
}
