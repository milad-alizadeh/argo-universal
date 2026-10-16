import type { ReactElement } from 'react';
import {
  GroupedListItem,
  type GroupedListItemProps,
} from '#primitives/lists/grouped-list-item';
import { AgentIcon } from './agent-icon';
import type { ComposerConfigurationProps } from './configuration-types';

type Props = { configuration: ComposerConfigurationProps; wide: boolean };

export function AgentDrill(props: Props): ReactElement {
  return <GroupedListItem {...agentRow(props)} />;
}

const agentRow = ({ configuration, wide }: Props): GroupedListItemProps => {
  const agent = configuration.agents.find(
    ({ id }) => id === configuration.agent,
  );

  return {
    label: 'Agent',
    value: selectedName(configuration),
    valueLeading: <AgentIcon agent={agent} role={wide ? 'control' : 'row'} />,
  };
};

const selectedName = (configuration: ComposerConfigurationProps): string =>
  configuration.agents.find(({ id }) => id === configuration.agent)?.name ??
  configuration.agent;
