/*
 * Which real Agent a perf run drives, and what it is pinned to, from `PERF_AGENT` and
 * `PERF_AGENT_OPTIONS`.
 *
 * Neither the Agent nor the options have a default, and neither is named here. ADR-0004 keeps
 * vendor names inside the vendor module, so this harness cannot hold a table of Agents and their
 * cheapest models; and a default pin would be the silent fallback that a real-Agent run most needs
 * to avoid, since an adapter's own default is its most expensive. A run that names an Agent must
 * therefore say what to pin it to, and the pin is read back from the Agent before anything is
 * prompted (`real-agent-cost.mts`).
 */

// One Session option a run pins before its first prompt, as `configId=value`.
export interface PinnedOption {
  configId: string;
  value: string;
}

export interface RealAgentChoice {
  id: string;
  pin: readonly PinnedOption[];
}

export interface RealAgentEnvironment {
  agent: string | undefined;
  options: string | undefined;
}

const refuse = (reason: string): never => {
  throw new Error(
    `PERF_AGENT_OPTIONS ${reason}. A real-Agent perf run bills the owner, and an Agent prompted without a stated pin runs at its own default, which is its most expensive. State the options as configId=value, comma separated.`,
  );
};

function pinnedOption(pair: string): PinnedOption {
  const [configId, value] = pair.split('=');

  if (!configId || !value) return refuse(`has no value for ${pair}`);

  return { configId, value };
}

const duplicated = (pin: readonly PinnedOption[]): string | undefined => {
  const seen = new Set<string>();

  return pin.find(({ configId }) => {
    if (seen.has(configId)) return true;
    seen.add(configId);

    return false;
  })?.configId;
};

const eachPinnedOnce = (
  pin: readonly PinnedOption[],
): readonly PinnedOption[] => {
  const twice = duplicated(pin);

  return twice === undefined
    ? pin
    : refuse(`names ${twice} more than once, so only one would be pinned`);
};

function readPin(options: string | undefined): readonly PinnedOption[] {
  const pairs = (options ?? '').split(',').filter(Boolean);

  return pairs.length
    ? eachPinnedOnce(pairs.map(pinnedOption))
    : refuse('names no options to pin');
}

// The chosen Agent and its pin, or undefined when the run drives no real Agent at all.
export function realAgentChoice({
  agent,
  options,
}: RealAgentEnvironment): RealAgentChoice | undefined {
  if (!agent) return undefined;

  return { id: agent, pin: readPin(options) };
}

// What the run was asked to drive, read once so a suite and its report agree.
export const environmentRealAgent = (): RealAgentChoice | undefined =>
  realAgentChoice({
    agent: process.env.PERF_AGENT,
    options: process.env.PERF_AGENT_OPTIONS,
  });
