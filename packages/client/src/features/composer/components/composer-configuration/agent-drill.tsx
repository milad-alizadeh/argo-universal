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

// Paper: the desktop menu's Agent row is text only; the phone sheet keeps the Agent's icon.
const agentRow = ({ configuration, wide }: Props): ListItemProps => ({
  title: 'Agent',
  value: agentName(configuration.agent, configuration.agentId),
  leading: wide ? undefined : (
    <AgentIcon agent={configuration.agent} role="row" />
  ),
});
