import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  context,
  build,
  type BuildContext,
  type BuildResult,
  type Plugin,
  type OutputFile,
  type BuildOptions,
} from 'esbuild';
import { requirePluginFile } from '../access/plugin-files';
import type { PluginEntry } from '../protocol/runtime';
import { pluginFiles } from './files';
import { DevVersion } from './version';

export type BundleCallbacks = {
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
 * esbuild builds the Plugin's import graph, and watches it for changes while `watch` is on (a dev Server); otherwise it
 * builds once. Build output stays in memory and never changes the Plugin folder; every input is confined to that folder.
 */
export async function watchPlugin(
  entry: Pick<PluginEntry, 'directory' | 'main'>,
  callbacks: BundleCallbacks,
  watch = true,
): Promise<BuildContext> {
  const build = await context({
    ...devBuildOptions,
    stdin: entrySource(entry),
    plugins: watchPlugins(entry.directory, callbacks),
  });

  await (watch ? build.watch() : buildOnce(build));

  return build;
}

// A build that fails reports through the callbacks; its rejection adds nothing, and nothing is kept watching.
async function buildOnce(build: BuildContext): Promise<void> {
  await build.rebuild().catch(() => null);
  await build.dispose();
}

function watchPlugins(directory: string, callbacks: BundleCallbacks): Plugin[] {
  const version = new DevVersion();

  return [
    pluginFiles(directory, version.record),
    reloadPlugin(directory, { callbacks, version }),
  ];
}

const registrationSource = (path: string): string =>
  `export { register } from ${JSON.stringify(path)};`;

type Completion = { callbacks: BundleCallbacks; version: DevVersion };

const reloadPlugin = (directory: string, completion: Completion): Plugin => ({
  name: 'argo-reload',
  setup: (api): void => {
    api.onStart(() => recordManifest(directory, completion.version));
    api.onEnd((result) => completed(result, completion));
  },
});

// Manifest-only edits still change what the open App can draw.
async function recordManifest(
  directory: string,
  version: DevVersion,
): Promise<void> {
  version.reset();

  const path = await requirePluginFile(
    directory,
    join(directory, 'plugin.json'),
  );

  version.record(path, await readFile(path, 'utf8'));
}

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
