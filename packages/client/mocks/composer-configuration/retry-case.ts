import type { AgentInfo } from '@repo/contracts';
import { newSessionCatalogs, recordedSessionOptions } from '@repo/mocks/app';
import { fn } from 'storybook/test';
import type { Configuration } from './common';
interface RetryCase {
  agent: AgentInfo;
  other: AgentInfo;
  installStep: string;
}
export interface RetryScenario {
  width: number;
  session: 'new' | 'started';
  recorded: RetryCase;
  onAgentChange: ReturnType<typeof fn>;
  onAgentRetry: ReturnType<typeof fn>;
}
export function retryCase(agentIndex: number): RetryCase {
  const agent = retryAgent(agentIndex);
  const other = newSessionCatalogs.bothUnavailable.find(
    (entry) => entry.agent !== agent.agent,
  );
  if (!other) throw new Error(retryRequirements);
  return { agent, other, installStep: retryReason(agent) };
}
const retryRequirements =
  'Recorded catalog needs two unavailable Agents with a reason.';
function retryAgent(agentIndex: number): AgentInfo {
  const agent = newSessionCatalogs.bothUnavailable[agentIndex];
  if (!agent) throw new Error(retryRequirements);
  return agent;
}
function retryReason(agent: AgentInfo): string {
  if (!agent.installStep) throw new Error(retryRequirements);
  return agent.installStep;
}
export function retryConfiguration(scenario: RetryScenario): Configuration {
  const { recorded, session, onAgentChange, onAgentRetry } = scenario;
  return {
    agents: newSessionCatalogs.bothUnavailable,
    agent: recorded.agent.agent,
    configOptions: recordedSessionOptions(recorded.agent.agent),
    onConfigChange: fn(),
    onAgentChange: session === 'new' ? onAgentChange : undefined,
    onAgentRetry,
    checkout: retryCheckout,
  };
}

const retryCheckout = { branch: 'main', newWorktree: false };
