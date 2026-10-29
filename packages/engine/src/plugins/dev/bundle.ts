import {
  context,
  build,
  type BuildContext,
  type BuildResult,
  type Plugin,
  type OutputFile,
  type BuildOptions,
} from 'esbuild';
import type { PluginEntry } from '../protocol/runtime';
import { pluginFiles } from './files';
import { DevVersion } from './version';

type BundleCallbacks = {
  loaded: (source: string, version: string) => void;
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
    stdin: entrySource(entry),
    plugins: watchPlugins(entry.directory, callbacks),
  });

  await build.watch();

  return build;
}

function watchPlugins(directory: string, callbacks: BundleCallbacks): Plugin[] {
  const version = new DevVersion();

  return [
    pluginFiles(directory, version.record),
    reloadPlugin({ callbacks, version }),
  ];
}

const registrationSource = (path: string): string =>
  `export { register } from ${JSON.stringify(path)};`;

type Completion = { callbacks: BundleCallbacks; version: DevVersion };

const reloadPlugin = (completion: Completion): Plugin => ({
  name: 'argo-reload',
  setup: (api): void => {
    api.onStart(completion.version.reset);
    api.onEnd((result) => completed(result, completion));
  },
});

function completed(result: BuildResult, completion: Completion): void {
  if (result.errors.length) {
    completion.callbacks.failed(
      result.errors.map((error) => error.text).join('; '),
    );

    return;
  }

  loaded(result.outputFiles ?? [], completion);
}

function loaded(files: OutputFile[], completion: Completion): void {
  const output = files.at(0);

  if (output)
    completion.callbacks.loaded(
      output.text,
      completion.version.value(output.text),
    );
}

export async function bundlePlugin(
  entry: Pick<PluginEntry, 'directory' | 'main'>,
): Promise<BuildResult> {
  return build({
    ...devBuildOptions,
    metafile: true,
    absWorkingDir: entry.directory,
    stdin: entrySource(entry),
    plugins: [pluginFiles(entry.directory)],
  });
}

function entrySource(
  entry: Pick<PluginEntry, 'directory' | 'main'>,
): BuildOptions['stdin'] {
  return {
    contents: registrationSource(`./${entry.main}`),
    resolveDir: entry.directory,
  };
}
