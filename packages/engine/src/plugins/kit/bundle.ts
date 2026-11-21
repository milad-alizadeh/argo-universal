import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build, type BuildOptions, type BuildResult } from 'esbuild';

let bundled: Promise<string> | null = null;

/*
 * The kit (the JSX runtime and the kit components) and the Plugin API run inside each Plugin's
 * context, so no object from the worker's realm reaches Plugin code. They are bundled once in the
 * host, from source, and each worker is handed the result.
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

function textOf(result: BuildResult<typeof options>): string {
  const output = result.outputFiles.at(0);

  if (!output) throw new Error('The Plugin kit did not build');

  return output.text;
}

// A test run bundles the kit once and names the file here, so each Plugin host it starts reads that instead of bundling again.
export const prebuiltKitVariable = 'ARGO_PREBUILT_PLUGIN_KIT';

export const buildKit = (): Promise<string> => build(options).then(textOf);

const prebuiltKit = (): Promise<string> | null => {
  const file = process.env[prebuiltKitVariable];

  return file ? readFile(file, 'utf8') : null;
};

export function bundleKit(): Promise<string> {
  bundled ??= prebuiltKit() ?? buildKit();

  return bundled;
}
