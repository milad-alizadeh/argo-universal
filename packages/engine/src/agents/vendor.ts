import type { SuggestionModelChoice } from '@repo/contracts';
import { satisfies } from 'semver';
import type { AgentLaunch } from './agent-launch';

export const vendorRegistryIds = {
  claude: 'claude-acp',
  codex: 'codex-acp',
} as const;

// Everything Argo sets for one Agent rather than learning from it over ACP. An Agent with no entry gets none of it.
type VendorDefaults = {
  // Added to every launch environment, under the user's saved one.
  launchEnvironment?: Readonly<Record<string, string>>;
  // What the saved launch environment starts as when the user installs the Agent; the user may change or clear it.
  installEnvironment?: Readonly<Record<string, string>>;
  // Terminal sign-in output that means success before the program exits, by method (Zed `conversation_view.rs`).
  terminalSuccess?: Readonly<Record<string, readonly string[]>>;
  // The Agent's ACP package names, and the versions of each that take a steering Prompt during a Turn.
  steering?: { packages: readonly string[]; versions: string };
  // The model that predicts Follow-up suggestions until the user picks one; a value from the Agent's own model list.
  suggestionModel?: SuggestionModelChoice;
};

const vendors = new Map<string, VendorDefaults>([
  [
    vendorRegistryIds.claude,
    {
      launchEnvironment: { ANTHROPIC_API_KEY: '' },
      // Claude Code gives its current models no task tools without the flag, so it reports no Plan.
      installEnvironment: { CLAUDE_CODE_ENABLE_TODO_TOOLS: '1' },
      terminalSuccess: {
        'claude-login': ['Login successful', 'Type your message'],
      },
      steering: {
        packages: ['@agentclientprotocol/claude-agent-acp', 'claude-agent-acp'],
        versions: '>=0.97.0',
      },
      // A suggestion costs about a fiftieth of one on the Session's model, with the same quality (#2150).
      suggestionModel: { type: 'model', value: 'haiku' },
    },
  ],
  [
    vendorRegistryIds.codex,
    {
      // Codex keeps `update_plan` off unless its config turns it on, so it reports no Plan. The Argo instructions reach it as its ACP system prompt (ADR-0053).
      installEnvironment: {
        CODEX_CONFIG: JSON.stringify({
          tools: { update_plan: { enabled: true } },
        }),
      },
      steering: {
        packages: ['@agentclientprotocol/codex-acp', 'codex-acp'],
        versions: '>=2.4.0',
      },
    },
  ],
]);

const defaultsOf = (registryId: string | undefined): VendorDefaults =>
  vendors.get(registryId ?? '') ?? {};

export const seededEnvironment = (
  registryId: string,
): Readonly<Record<string, string>> =>
  defaultsOf(registryId).installEnvironment ?? {};

export const vendorEnvironment = (
  launch: Pick<AgentLaunch, 'registryId'>,
): Readonly<Record<string, string>> =>
  defaultsOf(launch.registryId).launchEnvironment ?? {};

export const terminalSuccessPatterns = (
  launch: Pick<AgentLaunch, 'agentId'>,
  methodId: string,
): readonly string[] =>
  defaultsOf(launch.agentId).terminalSuccess?.[methodId] ?? [];

export const defaultSuggestionModel = (
  registryId: string,
): SuggestionModelChoice =>
  defaultsOf(registryId).suggestionModel ?? { type: 'session' };

const steeringOf = (packageName: string): VendorDefaults['steering'] =>
  [...vendors.values()]
    .map((vendor) => vendor.steering)
    .find((steering) => steering?.packages.includes(packageName));

export function supportsOwnedSteering(
  info: { name: string; version: string } | null | undefined,
): boolean {
  if (!info) return false;

  const steering = steeringOf(info.name);

  return steering ? satisfies(info.version, steering.versions) : false;
}
