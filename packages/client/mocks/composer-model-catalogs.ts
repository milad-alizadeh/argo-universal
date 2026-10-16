import type { AgentServer, SessionConfigOption } from '@repo/contracts';
import { newSessionCatalogs, recordedSessionOptions } from '@repo/mocks/app';
import type { ComposerProps } from '../src/features/composer/components/composer/composer';
import { composerLongAgentCatalog } from './composer-agent-catalogs';

function firstAvailableAgent(): AgentServer {
  const agent = newSessionCatalogs.bothAvailable[0];

  if (!agent) throw new Error('Recorded catalog needs an available Agent.');

  return agent;
}

const longModelAgent = firstAvailableAgent();

const longModelOption = recordedSessionOptions(longModelAgent.id).find(
  (option) => option.category === 'model' && option.type === 'select',
);

const longModelTemplate =
  longModelOption?.type === 'select'
    ? longModelOption.options.flatMap((entry) =>
        'groupId' in entry ? entry.options : [entry],
      )[0]
    : undefined;

if (longModelOption?.type !== 'select' || !longModelTemplate)
  throw new Error('Recorded catalog needs an Agent with a model choice.');

export const composerLongModelList = Array.from({ length: 24 }, (_, index) => ({
  ...longModelTemplate,
  value: `development-model-${index + 1}`,
  name: `Model ${String(index + 1).padStart(2, '0')}`,
  description: 'Best for everyday, complex tasks',
  _meta: undefined,
}));

// More Agents and models than the desktop menu shows at once, so both lists scroll.
export const composerLongListConfiguration: NonNullable<
  ComposerProps['configuration']
> = {
  agents: [longModelAgent, ...composerLongAgentCatalog],
  agent: longModelAgent.id,
  configOptions: recordedSessionOptions(longModelAgent.id).map((option) =>
    option.configId === longModelOption.configId && option.type === 'select'
      ? {
          ...option,
          currentValue: 'development-model-1',
          options: composerLongModelList,
        }
      : option,
  ),
  onAgentChange: () => {},
  onConfigChange: () => {},
  checkout: { branch: 'main', newWorktree: false },
};

const fastModeAgent = firstAvailableAgent();

// No adapter offers Fast mode yet, so this on/off option stands in until one is recorded.
export function composerFastModeConfiguration(
  on: boolean,
): NonNullable<ComposerProps['configuration']> {
  return {
    agents: newSessionCatalogs.bothAvailable,
    agent: fastModeAgent.id,
    configOptions: [
      ...recordedSessionOptions(fastModeAgent.id),
      fastModeOption(on),
    ],
    onConfigChange: () => {},
    checkout: { branch: 'main', newWorktree: false },
  };
}

function fastModeOption(on: boolean): SessionConfigOption {
  return {
    type: 'boolean',
    configId: 'fast',
    name: 'Fast mode',
    description: 'Quicker replies, at a higher cost',
    currentValue: on,
  };
}
