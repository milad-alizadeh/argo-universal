import { acpConfiguration } from './acp-configuration.ts';
import type { ScriptedScenario, ScriptedStep } from './scripted-scenario.ts';

export const agentTitle = 'Fix the Session list reconnect';

const titleUpdate = (title: string | null): ScriptedStep => ({
  type: 'update',
  update: { sessionUpdate: 'session_info_update', title },
});

type TitleScenarios = Record<
  'agent-title' | 'agent-title-after-question' | 'agent-title-cleared',
  ScriptedScenario
>;

const titled = (steps: ScriptedStep[]): ScriptedScenario => ({
  configOptions: acpConfiguration,
  steps,
});

export const titleScenarios = (
  reply: ScriptedStep,
  question: ScriptedStep,
): TitleScenarios => ({
  'agent-title': titled([titleUpdate(agentTitle), reply]),
  // The question holds the Turn, so an App sees the first prompt line as the title before the Agent's title replaces it.
  'agent-title-after-question': titled([
    question,
    titleUpdate(agentTitle),
    reply,
  ]),
  'agent-title-cleared': titled([titleUpdate(null), titleUpdate('  '), reply]),
});
