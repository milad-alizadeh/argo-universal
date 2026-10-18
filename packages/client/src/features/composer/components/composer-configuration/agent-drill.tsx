import type { ReactElement } from 'react';
import { ListItem } from '#primitives/lists/list-item';
import type { ListItemProps } from '#primitives/lists/list-item';
import { AgentIcon } from './agent-icon';
import type { ComposerConfigurationProps } from './configuration-types';
import { agentName } from './configuration-values';

type Props = { configuration: ComposerConfigurationProps; wide: boolean };

export function AgentDrill(props: Props): ReactElement {
  return <ListItem {...agentRow(props)} />;
}

const agentRow = ({ configuration, wide }: Props): ListItemProps => ({
  title: 'Agent',
  value: agentName(configuration.agent, configuration.agentId),
  leading: (
    <AgentIcon agent={configuration.agent} role={wide ? 'control' : 'row'} />
  ),
});
