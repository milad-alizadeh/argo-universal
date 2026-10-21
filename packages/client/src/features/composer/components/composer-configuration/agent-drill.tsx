import { Drill } from '@repo/kit/primitives/overlays/drill';
import type { ReactElement, ComponentProps } from 'react';
import { AgentChoices } from '../start-session-in/agent-picker-choices';
import { AgentIcon } from './agent-icon';
import { ConfigurationRowIcon } from './configuration-row-icon';
import type { ComposerConfigurationProps } from './configuration-types';
import { agentName } from './configuration-values';
import { useAgentPick, type AgentPick } from './use-agent-pick';

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
  const picking = useAgentPick(
    props.configuration,
    props.choices.onChange,
    props.close,
  );

  return <AgentChoices {...agentChoicesProps(props, picking)} />;
}

function agentChoicesProps(
  props: ChoicesProps,
  picking: AgentPick,
): ComponentProps<typeof AgentChoices> {
  const { configuration, choices, close } = props;

  return {
    agents: choices.agents,
    agent: configuration.agent,
    pending: picking.pending,
    onAgentChange: picking.pick,
    onAddAgents: choices.onAdd,
    close: leaving(close),
  };
}

// Add Agents leaves at once: it is not a choice the picker waits on.
const leaving =
  (close: () => void) =>
  (after?: () => void): void => {
    close();
    after?.();
  };
