import { delimiter } from 'node:path';
import type {
  PluginProjectInfo,
  PluginSettingValue,
} from '@repo/contracts/plugins';
import type { TestAccounts } from '@repo/engine/mocks/test-accounts';
import {
  createPluginRuntime,
  HeldSecrets,
  pluginSettingsSecretService,
  type PluginRuntime,
  type SecretStore,
} from '@repo/engine/plugins';
import { isSecretSetting, type ConfiguredTest } from './test-configuration';
import type { PluginTestOptions } from './test-types';

export { configureTest, type ConfiguredTest } from './test-configuration';

export type RuntimeParts = {
  secretStore: SecretStore;
  accounts: TestAccounts['accounts'];
};

// Every Secret the store reads or writes is held, as the Server holds it (ADR-0051).
export function runtimeFor(
  home: string,
  options: ConfiguredTest,
  { accounts, secretStore }: RuntimeParts,
): PluginRuntime {
  const heldSecrets = new HeldSecrets();
  const held = heldSecrets.keeping(secretStore);

  return createPluginRuntime(home, {
    accounts,
    secretStore: held,
    heldSecrets,
    clockStart: options.clockStart,
    network: options.network,
    oauth: oauthOf(options),
    settings: settingsOf(options, held),
    ...projectOptions(options),
    environment: testEnvironment(options),
  });
}

const plainSetting = (
  { settingsByPlugin }: ConfiguredTest,
  id: string,
  key: string,
): PluginSettingValue | null => settingsByPlugin.get(id)?.get(key) ?? null;

// A secret Setting is read from the secret store, as the Server reads it; any other from the test's values.
const settingsOf =
  (options: ConfiguredTest, store: SecretStore) =>
  async (id: string, key: string): Promise<PluginSettingValue | null> =>
    isSecretSetting(options, id, key)
      ? store.get(pluginSettingsSecretService(id), key)
      : plainSetting(options, id, key);

// The browser a sign-in opens is the test's own when it gave one.
const oauthOf = ({
  openBrowser,
}: ConfiguredTest): { open: (url: string) => Promise<void> } | undefined =>
  openBrowser && { open: openBrowser };

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
