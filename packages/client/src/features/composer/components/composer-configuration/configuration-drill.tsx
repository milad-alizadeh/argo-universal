import type { ReactElement } from 'react';
import {
  Drill,
  type DrillProps as PrimitiveDrillProps,
} from '#primitives/overlays/drill';
import { AgentChoices } from './agent-choices';
import { AgentIcon } from './agent-icon';
import type { ComposerConfigurationProps } from './configuration-types';
import { modelName, selectedChoice, selection } from './configuration-values';
import { ModelChoices } from './model-choices';

interface DrillProps {
  configuration: ComposerConfigurationProps;
  page: 'agent' | 'model';
  wide: boolean;
}

type RowContent = Pick<PrimitiveDrillProps, 'label' | 'value' | 'valueLeading'>;

const pages = {
  agent: { title: 'Select Agent', Choices: AgentChoices },
  model: { title: 'Select Model', Choices: ModelChoices },
};

export function ConfigurationDrill(props: DrillProps): ReactElement | null {
  if (!hasChoices(props)) return null;
  const { title, Choices } = pages[props.page];

  return (
    <Drill {...rowContent(props)} title={title} contentScrolls>
      {(close) => (
        <Choices configuration={props.configuration} onSelect={close} />
      )}
    </Drill>
  );
}

function hasChoices(props: DrillProps): boolean {
  return props.page === 'agent' || !!selection(props.configuration, 'model');
}

function rowContent(props: DrillProps): RowContent {
  return props.page === 'model'
    ? {
        label: 'Model',
        value: modelName(selectedChoice(props.configuration, 'model')),
      }
    : agentRowContent(props);
}

function agentRowContent(props: DrillProps): RowContent {
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
