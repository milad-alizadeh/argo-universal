import type { AgentInfo } from '@repo/contracts';
import { newSessionCatalogs, recordedSessionOptions } from '@repo/mocks/app';
import type { ComposerProps } from '../src/features/composer/components/composer/composer';
export const composerLongAgentCatalog: AgentInfo[] = Array.from(
  { length: 40 },
  (_, index) => {
    const agent = newSessionCatalogs.bothReady[0];
    if (!agent) throw new Error('Composer needs an available Agent mock.');
    return {
      ...agent,
      agent: `development-agent-${index + 1}`,
      label: `Agent ${String(index + 1).padStart(2, '0')}`,
    };
  },
);

export const composerUnlistedEffortConfigurations =
  newSessionCatalogs.bothReady.map(
    (agent): NonNullable<ComposerProps['configuration']> => ({
      agents: newSessionCatalogs.bothReady,
      agent: agent.agent,
      configOptions: recordedSessionOptions(agent.agent).map((option) =>
        option.category === 'thought_level' && option.type === 'select'
          ? { ...option, currentValue: 'unsupported' }
          : option,
      ),
      onConfigChange: () => {},
      checkout: { branch: 'main', newWorktree: false },
    }),
  );

export const composerCantStartConfigurations =
  newSessionCatalogs.bothCantStart.map(
    (agent): NonNullable<ComposerProps['configuration']> => ({
      agents: newSessionCatalogs.bothCantStart,
      agent: agent.agent,
      configOptions: recordedSessionOptions(agent.agent),
      onConfigChange: () => {},
      checkout: { branch: 'main', newWorktree: false },
    }),
  );
