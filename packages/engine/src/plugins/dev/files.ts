import { readFile } from 'node:fs/promises';
import { dirname, extname } from 'node:path';
import type { Loader, OnLoadArgs, OnLoadResult, Plugin } from 'esbuild';
import { requirePluginFile } from '../discovery/plugin-files';

type ObserveSource = (path: string, contents: string) => void;

const loaders = new Map<string, Loader>([
  ['.js', 'jsx'],
  ['.jsx', 'jsx'],
  ['.ts', 'ts'],
  ['.tsx', 'tsx'],
  ['.mjs', 'js'],
  ['.cjs', 'js'],
  ['.mts', 'ts'],
  ['.cts', 'ts'],
  ['.json', 'json'],
]);

export const pluginFiles = (
  directory: string,
  observed?: ObserveSource,
): Plugin => ({
  name: 'argo-plugin-files',
  setup: (build): void => {
    build.onLoad({ filter: /.*/, namespace: 'file' }, (input) =>
      loadSource(directory, input, observed),
    );
  },
});

async function loadSource(
  directory: string,
  input: OnLoadArgs,
  observed?: ObserveSource,
): Promise<OnLoadResult | undefined> {
  const path = await requirePluginFile(directory, input.path);
  const loader = loaders.get(extname(input.path));

  if (!loader) return;
  const contents = await readFile(path, 'utf8');
  observed?.(path, contents);

  return { contents, loader, resolveDir: dirname(path), watchFiles: [path] };
}
