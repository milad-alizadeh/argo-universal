import { delimiter } from 'node:path';
import type {
  PluginProjectInfo,
  PluginSettingValue,
} from '@repo/contracts/plugins';
import type { PluginSessionInfo } from '@repo/contracts/plugins/argo-calls';
import type { TestAccounts } from '@repo/engine/mocks/test-accounts';
import {
  createPluginRuntime,
  pluginSettingsSecretService,
  type HeldSecrets,
  type PluginRuntime,
  type SecretStore,
} from '@repo/engine/plugins';
import { isSecretSetting, type ConfiguredTest } from './test-configuration';
import type { PluginTestOptions, TestSession } from './test-types';

export { configureTest, type ConfiguredTest } from './test-configuration';

export type RuntimeParts = {
  secretStore: SecretStore;
  heldSecrets: HeldSecrets;
  accounts: TestAccounts['accounts'];
};

const hostOf = ({
  clockStart,
  promptSession,
  withdrawPrompt,
  archiveSession,
  network,
}: ConfiguredTest): Pick<
  ConfiguredTest,
  | 'clockStart'
  | 'promptSession'
  | 'withdrawPrompt'
  | 'archiveSession'
  | 'network'
> => ({ clockStart, promptSession, withdrawPrompt, archiveSession, network });

export function runtimeFor(
  home: string,
  options: ConfiguredTest,
  parts: RuntimeParts,
): PluginRuntime {
  return createPluginRuntime(home, {
    ...parts,
    ...hostOf(options),
    oauth: oauthOf(options),
    settings: settingsOf(options, parts.secretStore),
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

type ProjectOptions = Pick<
  Parameters<typeof createPluginRuntime>[1],
  'projects' | 'projectPath' | 'projectIds' | 'projectInfo' | 'sessionInfo'
>;

function projectOptions(options: ConfiguredTest): ProjectOptions {
  return {
    ...projectLists(options),
    projectPath: async (projectId) => options.projectPaths[projectId],
    sessionInfo: async (sessionId) => sessionOf(options, sessionId),
  };
}

function projectLists(
  options: ConfiguredTest,
): Pick<ProjectOptions, 'projects' | 'projectIds' | 'projectInfo'> {
  return {
    projects: async (): Promise<string[]> =>
      Object.values(options.projectPaths),
    projectIds: async (): Promise<string[]> =>
      options.projects.map(({ id }) => id),
    projectInfo: async (): Promise<PluginProjectInfo[]> => options.projects,
  };
}

// A test's Session is busy unless it says how long it has been idle.
const withIdle = (session: TestSession): PluginSessionInfo => ({
  ...session,
  idleFor: session.idleFor ?? null,
});

function sessionOf(
  options: ConfiguredTest,
  sessionId: string,
): PluginSessionInfo | null {
  const session = options.sessions?.[sessionId];

  return session ? withIdle(session) : null;
}

function testEnvironment(options: PluginTestOptions): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: [...(options.path ?? []), process.env.PATH ?? ''].join(delimiter),
  };
}
