import type { AgentServer } from '@repo/contracts';
import { Icon } from '@repo/kit/primitives/content/icon';
import { List } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import type * as React from 'react';
import { Platform } from 'react-native';
import { AgentIcon } from '../composer-configuration/agent-icon';

export interface AgentChoiceProps {
  agents: AgentServer[];
  agent?: AgentServer;
  onAgentChange: (id: string) => void;
  onAddAgents: () => void;
  // The Agent whose settings are still coming: its row shows a spinner instead of its mark.
  pending?: string;
  close: (after?: () => void) => void;
}

const maximumHeight = 320;

const choicesTestID = 'new-session-agents-scroll';

/*
 * The same list the Combobox's choices draw: a popover on the web, and on both phones the grouped
 * card a stock picker and our Settings pages use, filling the sheet page it was pushed onto.
 */
export function AgentChoices(props: AgentChoiceProps): React.JSX.Element {
  return <List {...listProps()}>{agentRows(props)}</List>;
}

type ChoiceListProps = Omit<
  React.ComponentProps<typeof List>,
  'items' | 'renderItem' | 'children'
>;

function listProps(): ChoiceListProps {
  const web = Platform.OS === 'web';

  return {
    fit: web,
    maxHeight: web ? maximumHeight : undefined,
    appearance: web ? 'plain' : 'cards',
    testID: choicesTestID,
  };
}

/*
 * Add Agents opens the Agents page; it is not one of the Agents to choose between, so it sits in
 * its own section rather than taking a check of its own in the choosing one.
 */
function agentRows(props: AgentChoiceProps): React.JSX.Element {
  return (
    <>
      <List.Section {...agentSelection(props)}>
        {props.agents.map((agent) => (
          <AgentChoice key={agent.id} agent={agent} choices={props} />
        ))}
      </List.Section>
      <List.Section>
        <ListItem {...addAgentsProps(props)} />
      </List.Section>
    </>
  );
}

type RowProps = { agent: AgentServer; choices: AgentChoiceProps };

function AgentChoice({ agent, choices }: RowProps): React.JSX.Element {
  return (
    <ListItem
      {...agentChoiceProps(agent)}
      pending={choices.pending === agent.id}
      leading={<AgentIcon agent={agent} size={{ compact: 'sm', wide: 'md' }} />}
    />
  );
}

const agentChoiceProps = (
  agent: AgentServer,
): React.ComponentProps<typeof ListItem> => ({
  title: agent.name,
  id: agent.id,
});

const addAgentsProps = (
  props: AgentChoiceProps,
): React.ComponentProps<typeof ListItem> => ({
  title: 'Add Agents',
  leading: <Icon name="add" size={{ compact: 'sm', wide: 'md' }} />,
  onPress: () => props.close(props.onAddAgents),
});

function agentSelection(
  props: AgentChoiceProps,
): React.ComponentProps<typeof List.Section> {
  return {
    selectionMode: 'single',
    selection: props.agent ? [props.agent.id] : [],
    // Whoever owns the choices decides when to leave them: the Agent's settings are not in yet.
    onSelectionChange: ([id]) => {
      if (id !== undefined) props.onAgentChange(id);
    },
  };
}
