import { delimiter } from 'node:path';
import type { PluginProjectInfo } from '@repo/contracts/plugins';
import { MemoryKeychain } from '@repo/engine/mocks/keychain';
import { createPluginRuntime, type PluginRuntime } from '@repo/engine/plugins';
import type { ConfiguredTest } from './test-configuration';
import type { PluginTestOptions } from './test-types';

export { configureTest, type ConfiguredTest } from './test-configuration';

export function runtimeFor(
  home: string,
  options: ConfiguredTest,
): PluginRuntime {
  return createPluginRuntime(home, {
    keychain: new MemoryKeychain(),
    clockStart: options.clockStart,
    network: options.network,
    settings: async (id, key) =>
      options.settingsByPlugin.get(id)?.get(key) ?? null,
    ...projectOptions(options),
    environment: testEnvironment(options),
  });
}

function projectOptions(
  options: ConfiguredTest,
): Pick<
  Parameters<typeof createPluginRuntime>[1],
  'projects' | 'projectPath' | 'projectInfo'
> {
  return {
    projects: async (): Promise<string[]> =>
      Object.values(options.projectPaths),
    projectPath: async (projectId) => options.projectPaths[projectId],
    projectInfo: async (): Promise<PluginProjectInfo[]> => options.projects,
  };
}

function testEnvironment(options: PluginTestOptions): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: [...(options.path ?? []), process.env.PATH ?? ''].join(delimiter),
  };
}
