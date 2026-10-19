import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, type BuildOptions, type BuildResult } from 'esbuild';

// The scripts a Plugin realm runs before Plugin code: its clock, then the kit with the Plugin API.
export type RealmSource = { clock: string; api: string };

let bundled: Promise<RealmSource> | null = null;

const entry = (file: string): string =>
  fileURLToPath(new URL(file, import.meta.url));

/*
 * The kit (React, the reconciler and the host config) and the Plugin API run inside each Plugin's
 * context, so no object from the worker's realm reaches Plugin code. They are bundled once per
 * worker, from source.
 */
const options = {
  entryPoints: {
    clock: entry('./realm-clock.ts'),
    api: entry('./realm-entry.ts'),
  },
  outdir: 'realm',
  bundle: true,
  write: false,
  format: 'iife',
  platform: 'neutral',
  mainFields: ['module', 'main'],
  conditions: ['import', 'module', 'default'],
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'silent',
} satisfies BuildOptions;

function sourceOf(result: BuildResult<typeof options>): RealmSource {
  const text = (name: string): string => {
    const output = result.outputFiles.find(
      (file) => basename(file.path) === `${name}.js`,
    );

    if (!output) throw new Error('The Plugin kit did not build');

    return output.text;
  };

  return { clock: text('clock'), api: text('api') };
}

export function bundleRealm(): Promise<RealmSource> {
  bundled ??= build(options).then(sourceOf);

  return bundled;
}
