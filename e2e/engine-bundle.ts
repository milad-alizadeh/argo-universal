import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build, type Plugin } from 'rolldown';

const serverDirectory = path.resolve(import.meta.dirname, '../apps/server');

// Every test starts its own Engine; one bundle per run starts it in about half the time tsx takes to compile it each time.
export const engineBundlePath = path.join(
  import.meta.dirname,
  '.engine/e2e-engine.mjs',
);

// Code that finds files beside its source, such as migrations, assets and the scripted Agent, keeps its source location in the bundle.
const sourceLocations: Plugin = {
  name: 'source-locations',
  transform: (code, id): string | null =>
    code.includes('import.meta.')
      ? code
          .replaceAll('import.meta.url', JSON.stringify(pathToFileURL(id).href))
          .replaceAll('import.meta.dirname', JSON.stringify(path.dirname(id)))
          .replaceAll('import.meta.filename', JSON.stringify(id))
      : null,
};

// Playwright global setup: bundles the E2E Engine bootstrap once before any worker starts.
export default async function bundleEngine(): Promise<void> {
  await build({
    cwd: serverDirectory,
    input: 'mocks/e2e-engine.ts',
    platform: 'node',
    external: ['node-pty', 'esbuild'],

    logLevel: 'warn',
    plugins: [sourceLocations],
    output: { file: engineBundlePath, format: 'esm' },
  });
}
