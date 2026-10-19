import { readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { createContext, runInNewContext, type Context } from 'node:vm';
import {
  collectPluginTests,
  test,
  type PluginTestCase,
} from '@argo/plugin-kit/testing';
import { build, type BuildOptions } from 'esbuild';

const testFilePattern = /\.test\.(?:js|mjs|ts)$/;

const registrationLimitMs = 3000;

const testBuildOptions = {
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false,
  external: ['@argo/plugin-kit/testing'],
  logLevel: 'silent',
} satisfies BuildOptions;

export async function pluginTestFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, {
    recursive: true,
    withFileTypes: true,
  });

  return entries
    .filter((entry) => entry.isFile() && testFilePattern.test(entry.name))
    .filter((entry) => !entry.parentPath.split('/').includes('node_modules'))
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();
}

export async function loadPluginTests(file: string): Promise<PluginTestCase[]> {
  const bundle = await build({ ...testBuildOptions, entryPoints: [file] });
  const source = bundle.outputFiles[0]?.text;

  if (!source) throw new Error(`No test output for ${file}`);

  return collectPluginTests(() => evaluateTests(source, file));
}

function evaluateTests(source: string, file: string): void {
  runInNewContext(source, testContext(file), { timeout: registrationLimitMs });
}

function testContext(file: string): Context {
  const require = createRequire(file);

  return createContext({
    require: (name: string) =>
      name === '@argo/plugin-kit/testing' ? { test } : require(name),
    module: { exports: {} },
    console,
    Buffer,
    process,
  });
}
