import { delimiter } from 'node:path';
import type {
  PluginManifest,
  PluginProjectInfo,
  PluginSettingField,
  PluginSettingValue,
} from '@repo/contracts/plugins';
import { MemoryKeychain } from '@repo/engine/mocks/keychain';
import {
  createPluginRuntime,
  readPluginManifest,
  type PluginRuntime,
} from '@repo/engine/plugins';
import type { PluginTestOptions } from './test-types';

export async function configureTest(
  options: PluginTestOptions,
): Promise<PluginTestOptions> {
  const manifest = await readPluginManifest(options.directory, options.version);

  return {
    ...options,
    settings: options.settings ?? defaultSettings(manifest),
  };
}

function defaultSettings(
  manifest: PluginManifest,
): Map<string, PluginSettingValue> {
  return new Map((manifest.contributes.settings ?? []).flatMap(settingDefault));
}

function settingDefault(
  field: PluginSettingField,
): [string, PluginSettingValue][] {
  if (!('default' in field)) return [];

  return field.default === undefined ? [] : [[field.key, field.default]];
}

export function runtimeFor(
  home: string,
  options: PluginTestOptions,
): PluginRuntime {
  return createPluginRuntime(home, {
    keychain: new MemoryKeychain(),
    clockStart: options.clockStart,
    settings: async (_id, key) => options.settings?.get(key) ?? null,
    projects: async (): Promise<string[]> => [],
    projectInfo: async (): Promise<PluginProjectInfo[]> =>
      options.projects ?? [],
    environment: testEnvironment(options),
  });
}

function testEnvironment(options: PluginTestOptions): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: [...(options.path ?? []), process.env.PATH ?? ''].join(delimiter),
  };
}
