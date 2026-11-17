import { join } from 'node:path';
import type { SuggestionModelChoice } from '@repo/contracts';
import { productCompatibility } from '@repo/contracts/product-identity';
import { satisfies } from 'semver';
import type { AgentLaunch } from './agent-launch';

export const vendorRegistryIds = {
  claude: 'claude-acp',
  codex: 'codex-acp',
  pi: 'pi-acp',
} as const;

// Everything Argo sets for one Agent rather than learning from it over ACP. An Agent with no entry gets none of it.
type VendorDefaults = {
  // Added to every launch environment, under the user's saved one.
  launchEnvironment?: Readonly<Record<string, string>>;
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
      steering: {
        packages: ['@agentclientprotocol/codex-acp', 'codex-acp'],
        versions: '>=2.4.0',
      },
    },
  ],
]);

const defaultsOf = (registryId: string | undefined): VendorDefaults =>
  vendors.get(registryId ?? '') ?? {};

// What an Agent's saved launch environment starts as when the user installs it; the user may change or clear it. No Agent needs a seed now: the checklist is Argo's own Operations (ADR-0053).
export const seededEnvironment = (
  _registryId: string,
): Readonly<Record<string, string>> => ({});

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
