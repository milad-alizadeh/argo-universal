import type { AgentLaunch } from './agent-launch';

export const vendorRegistryIds = {
  claude: 'claude-acp',
  codex: 'codex-acp',
} as const;

const environment = new Map<string, Readonly<Record<string, string>>>([
  [vendorRegistryIds.claude, { ANTHROPIC_API_KEY: '' }],
]);

// What an Agent's saved launch environment starts as when the user installs it; the user may change or clear it. No Agent needs a seed now: the checklist is Argo's own Operations (ADR-0053).
export const seededEnvironment = (
  _registryId: string,
): Readonly<Record<string, string>> => ({});

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
