import type { CoreHooks, PluginProjectInfo } from '@repo/contracts/plugins';
import type {
  PluginPromptAnswer,
  PluginSessionInfo,
  PluginWithdrawAnswer,
} from '@repo/contracts/plugins/argo-calls';
import type { PluginAccounts } from '../accounts/plugin-accounts';
import type { OAuthOptions } from '../accounts/plugin-oauth';
import type { PluginAssets } from '../assets/plugin-assets';
import type { PluginClock } from '../clock';
import type { Waiting } from '../hooks/spawn-hooks';
import type { PluginValue } from '../protocol/runtime';
import type { HeldSecrets } from './held-secrets';
import type { PluginNetwork } from './plugin-fetch';

// The Plugin a Prompt is sent as; the Feed names it by `title`.
export type PluginPromptSender = { pluginId: string; title: string };

export type PromptSession = (
  sessionId: string,
  text: string,
  sender: PluginPromptSender,
) => Promise<PluginPromptAnswer>;

// Takes back a Queued Prompt the Plugin sent; one that started, is gone or is held for editing stays.
export type WithdrawPrompt = (
  sessionId: string,
  queuedId: string,
  sender: PluginPromptSender,
) => Promise<PluginWithdrawAnswer>;

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
  // Archives a Session as the App's archive does, and throws when the Session may not be archived; without it no Session archives.
  archiveSession?: (sessionId: string) => Promise<void>;
  // Sends a Plugin's Prompt to a Session as the Plugin; without it no Plugin prompts.
  promptSession?: PromptSession;
  // Withdraws a Plugin's own Queued Prompt; without it no Plugin withdraws.
  withdrawPrompt?: WithdrawPrompt;
  network?: PluginNetwork;
  settings?: (pluginId: string, key: string) => Promise<PluginValue>;
  hooks?: CoreHooks;
  waiting?: Waiting;
  clock?: PluginClock;
  watchProjects?: (changed: () => void) => () => void;
  // The secret params of the Operations running now, which `log` already leaves out (ADR-0051).
  heldSecrets?: HeldSecrets;
};
