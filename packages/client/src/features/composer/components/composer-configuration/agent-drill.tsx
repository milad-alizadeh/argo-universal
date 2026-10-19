import type { ReactElement } from 'react';
import { Icon } from '#primitives/content/icon';
import { ListItem } from '#primitives/lists/list-item';
import { Drill } from '#primitives/overlays/drill';
import { AgentChoices } from '../start-session-in/agent-picker-choices';
import { AgentIcon } from './agent-icon';
import type { ComposerConfigurationProps } from './configuration-types';
import { agentName } from './configuration-values';

type Props = { configuration: ComposerConfigurationProps };

export function AgentDrill({ configuration }: Props): ReactElement {
  const choices = configuration.agentChoices;
  const leading = configuration.agent ? (
    <AgentIcon
      agent={configuration.agent}
      role={{ compact: 'body', wide: 'row' }}
    />
  ) : (
    <Icon fitArtwork name="agent" role={{ compact: 'body', wide: 'row' }} />
  );
  const value = agentName(configuration.agent, configuration.agentId);

  if (!choices)
    return <ListItem title="Agent" value={value} leading={leading} />;

  return (
    <Drill
      label="Agent"
      title="Select Agent"
      value={value || 'Choose Agent'}
      valueLeading={leading}
      contentScrolls
    >
      {(close) => (
        <AgentChoices
          agents={choices.agents}
          agent={configuration.agent}
          onAgentChange={choices.onChange}
          onAddAgents={choices.onAdd}
          close={(after) => {
            close();
            after?.();
          }}
        />
      )}
    </Drill>
  );
}
