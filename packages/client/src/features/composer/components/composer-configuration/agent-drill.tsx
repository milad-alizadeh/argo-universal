import type { ReactElement, ComponentProps } from 'react';
import { Drill } from '#primitives/overlays/drill';
import { AgentChoices } from '../start-session-in/agent-picker-choices';
import { AgentIcon } from './agent-icon';
import { ConfigurationRowIcon } from './configuration-row-icon';
import type { ComposerConfigurationProps } from './configuration-types';
import { agentName } from './configuration-values';

type Props = { configuration: ComposerConfigurationProps };

type ChoicesProps = Props & {
  choices: NonNullable<ComposerConfigurationProps['agentChoices']>;
  close: () => void;
};

// Only drawn where the Agent can still be chosen, so the choices are always there to drill into.
export function AgentDrill(props: Props): ReactElement | null {
  const choices = props.configuration.agentChoices;

  if (!choices) return null;

  return <AgentSelector {...props} choices={choices} />;
}

interface AgentRow {
  value: string;
  leading: ReactElement;
}

function agentRow(configuration: ComposerConfigurationProps): AgentRow {
  return {
    value: agentName(configuration.agent, configuration.agentId),
    leading: <AgentLeading configuration={configuration} />,
  };
}

function AgentSelector(props: Omit<ChoicesProps, 'close'>): ReactElement {
  const { value, leading } = agentRow(props.configuration);

  return (
    <Drill
      label="Agent"
      title="Select Agent"
      value={value || 'Choose Agent'}
      valueLeading={leading}
      contentScrolls
      mount="eager"
    >
      {(close) => <AgentDrillChoices {...props} close={close} />}
    </Drill>
  );
}

function AgentLeading({ configuration }: Props): ReactElement {
  return configuration.agent ? (
    <AgentIcon
      agent={configuration.agent}
      role={{ compact: 'body', wide: 'row' }}
    />
  ) : (
    <ConfigurationRowIcon name="agent" />
  );
}

function AgentDrillChoices(props: ChoicesProps): ReactElement {
  return <AgentChoices {...agentChoicesProps(props)} />;
}

function agentChoicesProps(
  props: ChoicesProps,
): ComponentProps<typeof AgentChoices> {
  const { configuration, choices, close } = props;

  return {
    agents: choices.agents,
    agent: configuration.agent,
    onAgentChange: choices.onChange,
    onAddAgents: choices.onAdd,
    close: (after) => {
      close();
      after?.();
    },
  };
}
