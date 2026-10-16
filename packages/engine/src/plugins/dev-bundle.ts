import {
  context,
  type BuildContext,
  type BuildResult,
  type Plugin,
  type OutputFile,
  type BuildOptions,
} from 'esbuild';
import { pluginFiles } from './dev-files';
import type { PluginEntry } from './runtime-protocol';

type BundleCallbacks = {
  loaded: (source: string) => void;
  failed: (error: string) => void;
};

const devBuildOptions: BuildOptions = {
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'neutral',
  external: ['@argo/plugin-kit', '@argo/plugin-kit/*'],
  jsx: 'automatic',
  jsxImportSource: '@argo/plugin-kit',
  loader: { '.js': 'jsx' },
  logLevel: 'silent',
};

/*
 * esbuild watches the Plugin's import graph. Build output stays in memory and
 * never changes the Plugin folder; every input is confined to that folder.
 */
export async function watchPlugin(
  entry: Pick<PluginEntry, 'directory' | 'main'>,
  callbacks: BundleCallbacks,
): Promise<BuildContext> {
  const build = await context({
    ...devBuildOptions,
    stdin: {
      contents: registrationSource(`./${entry.main}`),
      resolveDir: entry.directory,
    },
    plugins: [pluginFiles(entry.directory), reloadPlugin(callbacks)],
  });

  await build.watch();

  return build;
}

const registrationSource = (path: string): string =>
  `export { register } from ${JSON.stringify(path)};`;

const reloadPlugin = (callbacks: BundleCallbacks): Plugin => ({
  name: 'argo-reload',
  setup: (api): void => api.onEnd((result) => completed(result, callbacks)),
});

function completed(result: BuildResult, callbacks: BundleCallbacks): void {
  if (result.errors.length) {
    callbacks.failed(result.errors.map((error) => error.text).join('; '));

    return;
  }

  loaded(result.outputFiles ?? [], callbacks);
}

function loaded(files: OutputFile[], callbacks: BundleCallbacks): void {
  const output = files.at(0);

  if (output) callbacks.loaded(output.text);
}
