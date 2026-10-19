import type { InitializeResponse } from '@agentclientprotocol/sdk';
import type { AgentLaunch } from './agent-launch';

const environment = new Map<string, Readonly<Record<string, string>>>([
  ['claude-acp', { ANTHROPIC_API_KEY: '' }],
]);

// Terminal sign-in output that means success before the program exits, by Agent then method (Zed `conversation_view.rs`).
const terminalSuccess = new Map<
  string,
  Readonly<Record<string, readonly string[]>>
>([
  ['claude-acp', { 'claude-login': ['Login successful', 'Type your message'] }],
]);

export const vendorEnvironment = (
  launch: Pick<AgentLaunch, 'registryId'>,
): Readonly<Record<string, string>> =>
  launch.registryId ? (environment.get(launch.registryId) ?? {}) : {};

export const terminalSuccessPatterns = (
  launch: Pick<AgentLaunch, 'agentId'>,
  methodId: string,
): readonly string[] => terminalSuccess.get(launch.agentId)?.[methodId] ?? [];

// Grok accepts ACP image blocks but omits image:true in initialize.
// https://github.com/phuryn/grok-build-vscode/blob/main/research/vision-input.md
export function vendorInitialization(
  launch: Pick<AgentLaunch, 'registryId'>,
  initialization: InitializeResponse,
): InitializeResponse {
  if (launch.registryId !== 'grok-build') return initialization;

  return {
    ...initialization,
    agentCapabilities: {
      ...initialization.agentCapabilities,
      promptCapabilities: {
        ...initialization.agentCapabilities?.promptCapabilities,
        image: true,
      },
    },
  };
}
