import { delimiter } from 'node:path';
import type {
  PluginProjectInfo,
  PluginSettingValue,
} from '@repo/contracts/plugins';
import type { MemoryKeychain } from '@repo/engine/mocks/keychain';
import type { TestAccounts } from '@repo/engine/mocks/test-accounts';
import { createPluginRuntime, type PluginRuntime } from '@repo/engine/plugins';
import type { ConfiguredTest } from './test-configuration';
import type { PluginTestOptions } from './test-types';

export { configureTest, type ConfiguredTest } from './test-configuration';

export type RuntimeParts = {
  keychain: MemoryKeychain;
  accounts: TestAccounts['accounts'];
};

export function runtimeFor(
  home: string,
  options: ConfiguredTest,
  parts: RuntimeParts,
): PluginRuntime {
  return createPluginRuntime(home, {
    ...parts,
    clockStart: options.clockStart,
    network: options.network,
    oauth: options.openBrowser && { open: options.openBrowser },
    settings: settingsOf(options),
    ...projectOptions(options),
    environment: testEnvironment(options),
  });
}

const settingsOf =
  ({ settingsByPlugin }: ConfiguredTest) =>
  async (id: string, key: string): Promise<PluginSettingValue | null> =>
    settingsByPlugin.get(id)?.get(key) ?? null;

function projectOptions(
  options: ConfiguredTest,
): Pick<
  Parameters<typeof createPluginRuntime>[1],
  'projects' | 'projectPath' | 'projectInfo' | 'sessionInfo'
> {
  return {
    projects: async (): Promise<string[]> =>
      Object.values(options.projectPaths),
    projectPath: async (projectId) => options.projectPaths[projectId],
    projectInfo: async (): Promise<PluginProjectInfo[]> => options.projects,
    sessionInfo: async (sessionId) => options.sessions?.[sessionId] ?? null,
  };
}

function testEnvironment(options: PluginTestOptions): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: [...(options.path ?? []), process.env.PATH ?? ''].join(delimiter),
  };
}
