import { acpConfiguration } from './acp-configuration.ts';
import type { ScriptedScenario, ScriptedStep } from './scripted-scenario.ts';

export const agentTitle = 'Fix the Session list reconnect';

const titleUpdate = (title: string | null): ScriptedStep => ({
  type: 'update',
  update: { sessionUpdate: 'session_info_update', title },
});

type TitleScenarios = Record<
  'agent-title' | 'agent-title-cleared',
  ScriptedScenario
>;

export const titleScenarios = (reply: ScriptedStep): TitleScenarios => ({
  'agent-title': {
    configOptions: acpConfiguration,
    steps: [titleUpdate(agentTitle), reply],
  },
  'agent-title-cleared': {
    configOptions: acpConfiguration,
    steps: [titleUpdate(null), titleUpdate('  '), reply],
  },
});
