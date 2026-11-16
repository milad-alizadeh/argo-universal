import { join } from 'node:path';
import { productCompatibility } from '@repo/contracts/product-identity';
import type { AgentLaunch } from './agent-launch';

export const vendorRegistryIds = {
  claude: 'claude-acp',
  codex: 'codex-acp',
  pi: 'pi-acp',
} as const;

const environment = new Map<string, Readonly<Record<string, string>>>([
  [vendorRegistryIds.claude, { ANTHROPIC_API_KEY: '' }],
]);

const piCommand = 'PI_ACP_PI_COMMAND' as const;

const { environment: names, piLauncher } = productCompatibility;

// pi-acp's own variable for the pi it starts, and Argo's for the pi command the person had set there.
type PiSessionEnvironment = { [piCommand]: string } & Partial<
  Record<typeof names.piCommand, string>
>;

// What a Session's Agent process adds beside its access: pi-acp starts pi through Argo's launcher, which runs a pi command the person set.
export function vendorSessionEnvironment(
  launch: Pick<AgentLaunch, 'registryId'>,
  cliDirectory: string,
  launched: NodeJS.ProcessEnv,
): PiSessionEnvironment | undefined {
  if (launch.registryId !== vendorRegistryIds.pi) return undefined;

  const piSession: PiSessionEnvironment = {
    [piCommand]: join(cliDirectory, piLauncher),
  };

  const chosen = launched[piCommand];

  if (chosen) piSession[names.piCommand] = chosen;

  return piSession;
}

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
