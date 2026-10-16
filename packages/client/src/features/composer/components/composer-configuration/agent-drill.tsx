import type { AgentServer } from '@repo/contracts';
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

const agentRow = ({ configuration, wide }: Props): GroupedListItemProps => ({
  label: 'Agent',
  value: agentName(configuration.agent),
  valueLeading: (
    <AgentIcon agent={configuration.agent} role={wide ? 'control' : 'row'} />
  ),
});

const agentName = (agent?: AgentServer): string => agent?.name ?? '';
