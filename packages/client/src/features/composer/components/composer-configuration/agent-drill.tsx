import type { ReactElement } from 'react';
import { ListItem } from '#primitives/lists/list-item';
import type { ListItemProps } from '#primitives/lists/list-item';
import type { ComposerConfigurationProps } from './configuration-types';
import { agentName } from './configuration-values';

type Props = { configuration: ComposerConfigurationProps };

export function AgentDrill(props: Props): ReactElement {
  return <ListItem {...agentRow(props)} />;
}

// Paper: the desktop menu's read-only Agent row is text only; a sheet names the Agent in its title instead.
const agentRow = ({ configuration }: Props): ListItemProps => ({
  title: 'Agent',
  value: agentName(configuration.agent, configuration.agentId),
});
