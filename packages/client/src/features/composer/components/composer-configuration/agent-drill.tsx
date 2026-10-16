import type { ReactElement } from 'react';
import { Drill, type DrillProps } from '#primitives/overlays/drill';
import { AgentChoices } from './agent-choices';
import { AgentIcon } from './agent-icon';
import type { ComposerConfigurationProps } from './configuration-types';

interface AgentDrillProps {
  configuration: ComposerConfigurationProps;
  wide: boolean;
}

// The Agent row keeps its own choices: each Agent draws its registry icon and status, which Combobox options do not carry.
export function AgentDrill(props: AgentDrillProps): ReactElement {
  return (
    <Drill {...agentRow(props)} title="Select Agent" contentScrolls>
      {(close) => (
        <AgentChoices configuration={props.configuration} onSelect={close} />
      )}
    </Drill>
  );
}

function agentRow(
  props: AgentDrillProps,
): Pick<DrillProps, 'label' | 'value' | 'valueLeading'> {
  const agent = props.configuration.agents.find(
    (entry) => entry.agent === props.configuration.agent,
  );

  return {
    label: 'Agent',
    value: agent?.label,
    valueLeading: (
      <AgentIcon agent={agent} role={props.wide ? 'control' : 'row'} />
    ),
  };
}
