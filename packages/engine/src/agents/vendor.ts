import { argoInstructionsMarkdown } from '@repo/contracts/agents/argo-instructions';
import type { AgentLaunch } from './agent-launch';

export const vendorRegistryIds = {
  claude: 'claude-acp',
  codex: 'codex-acp',
} as const;

const environment = new Map<string, Readonly<Record<string, string>>>([
  [vendorRegistryIds.claude, { ANTHROPIC_API_KEY: '' }],
]);

// What an Agent's saved launch environment starts as when the user installs it; the user may change or clear it.
const installSeeds = new Map<string, Readonly<Record<string, string>>>([
  // Claude Code gives its current models no task tools without the flag, so it reports no Plan.
  [vendorRegistryIds.claude, { CLAUDE_CODE_ENABLE_TODO_TOOLS: '1' }],
  // Codex keeps `update_plan` off unless its config turns it on, so it reports no Plan. Codex hides MCP server instructions from its model, so the Argo instructions ride in as `developer_instructions` (ADR-0053).
  [
    vendorRegistryIds.codex,
    {
      CODEX_CONFIG: JSON.stringify({
        tools: { update_plan: { enabled: true } },
        developer_instructions: argoInstructionsMarkdown(),
      }),
    },
  ],
]);

export const seededEnvironment = (
  registryId: string,
): Readonly<Record<string, string>> => installSeeds.get(registryId) ?? {};

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
