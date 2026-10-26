import type { CoreHooks, PluginProjectInfo } from '@repo/contracts/plugins';
import type { PluginSessionInfo } from '@repo/contracts/plugins/argo-calls';
import type { PluginAccounts } from '../accounts/plugin-accounts';
import type { OAuthOptions } from '../accounts/plugin-oauth';
import type { PluginAssets } from '../assets/plugin-assets';
import type { PluginClock } from '../clock';
import type { Waiting } from '../hooks/spawn-hooks';
import type { PluginValue } from '../protocol/runtime';
import type { PluginNetwork } from './plugin-fetch';

export type PluginServiceOptions = {
  accounts?: PluginAccounts;
  wakePlugin?: (pluginId: string) => Promise<void>;
  oauth?: OAuthOptions;
  assets: PluginAssets;
  environment?: NodeJS.ProcessEnv;
  log: (line: string) => void;
  projects: () => Promise<readonly string[]>;
  projectInfo: () => Promise<PluginProjectInfo[]>;
  projectPath?: (projectId: string) => Promise<string | undefined>;
  // Answers `argo.sessions.get`; without it every Session reads as unknown.
  sessionInfo?: (sessionId: string) => Promise<PluginSessionInfo | null>;
  network?: PluginNetwork;
  settings?: (pluginId: string, key: string) => Promise<PluginValue>;
  hooks?: CoreHooks;
  waiting?: Waiting;
  clock?: PluginClock;
  watchProjects?: (changed: () => void) => () => void;
};
