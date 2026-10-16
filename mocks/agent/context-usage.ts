import type { UsageUpdate } from '@agentclientprotocol/sdk';
import { acpConfiguration } from './acp-configuration.ts';
import type { ScriptedScenario, ScriptedStep } from './scripted-scenario.ts';

export const contextUsageFixtures = {
  low: { used: 20_000, size: 200_000 },
  high: { used: 170_000, size: 200_000 },
  full: { used: 200_000, size: 200_000 },
} satisfies Record<string, UsageUpdate>;

type ContextUsageScenarios = Record<
  'usage-low' | 'usage-high' | 'usage-full',
  ScriptedScenario
>;

const usageScenario = (
  usage: UsageUpdate,
  reply: ScriptedStep,
): ScriptedScenario => ({
  configOptions: acpConfiguration,
  steps: [
    { type: 'update', update: { sessionUpdate: 'usage_update', ...usage } },
    reply,
  ],
});

// Each scenario reports one context usage fixture, then replies.
export const contextUsageScenarios = (
  reply: ScriptedStep,
): ContextUsageScenarios => ({
  'usage-low': usageScenario(contextUsageFixtures.low, reply),
  'usage-high': usageScenario(contextUsageFixtures.high, reply),
  'usage-full': usageScenario(contextUsageFixtures.full, reply),
});
