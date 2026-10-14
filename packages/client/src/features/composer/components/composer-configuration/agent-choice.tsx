import type { AgentInfo } from '@repo/contracts';
import type * as React from 'react';
import { SelectedCheck } from '#primitives/display/selected-check';
import { ListItem } from '#primitives/lists/list-item/list-item';
import { IconSlot, IconSpinner } from '../../../../lib/generic/symbols/icon';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import { AgentIcon } from './agent-icon';
import { agentStatusCopy, type AgentStatusCopy } from './agent-status-copy';
import type { ComposerConfigurationProps } from './configuration-types';

interface AgentChoiceProps {
  agent: AgentInfo;
  configuration: ComposerConfigurationProps;
  onSelect: () => void;
}

export function AgentChoice(props: AgentChoiceProps): React.JSX.Element {
  return (
    <>
      <AgentSelectionRow {...props} />
      <AgentStatusAction {...props} />
    </>
  );
}

// The picker's last row: it closes the picker and opens the Agents still to add.
export function AddAgentChoice({
  configuration,
  onSelect,
}: Omit<AgentChoiceProps, 'agent'>): React.JSX.Element | null {
  const { onAddAgent } = configuration;

  if (!onAddAgent) return null;

  const add = (): void => {
    onSelect();
    onAddAgent();
  };

  return <ListItem {...addAgentRow} onPress={add} />;
}

const addAgentRow = {
  title: 'Add a new agent',
  icon: 'add',
  role: 'button',
  disclosure: false,
} as const;

function AgentSelectionRow(props: AgentChoiceProps): React.JSX.Element {
  const wide = useWide();

  return (
    <ListItem
      {...agentSelectionProps(props)}
      leading={
        <AgentIcon agent={props.agent} role={wide ? 'control' : 'row'} />
      }
    />
  );
}

// Only a Ready Agent can be picked; a Checking… one dims with a spinner in the check's slot and keeps its height.
function agentSelectionProps(
  props: AgentChoiceProps,
): React.ComponentProps<typeof ListItem> {
  const { agent, configuration } = props;
  const selected = agent.agent === configuration.agent;

  return {
    ...agentRowContent(agent),
    disabled: !configuration.onAgentChange || agent.status !== 'ready',
    selected,
    accessory: <SelectionAccessory agent={agent} selected={selected} />,
    onPress: () => selectAgent(props),
  };
}

const checkingLabel = 'Checking…';

function SelectionAccessory(props: {
  agent: AgentInfo;
  selected: boolean;
}): React.JSX.Element {
  if (props.agent.status === 'checking') return <CheckingSpinner />;

  // An empty slot keeps every row the height of one with a check or spinner.
  return props.selected ? <SelectedCheck /> : <IconSlot role="mark" />;
}

function CheckingSpinner(): React.JSX.Element {
  return (
    <IconSlot role="mark">
      <IconSpinner
        iconRole="mark"
        colorClassName="accent-muted-foreground"
        accessibilityLabel={checkingLabel}
      />
    </IconSlot>
  );
}

function agentRowContent(
  agent: AgentInfo,
): React.ComponentProps<typeof ListItem> {
  return {
    title: agent.label,
    accessibilityLabel: `Select ${agent.label}`,
    role: 'button',
    disclosure: false,
    subtitle: agentSubtitle(agent),
  };
}

function AgentStatusAction(props: AgentChoiceProps): React.JSX.Element | null {
  const action = statusAction(props);

  if (!action) return null;

  return (
    <ListItem
      title={action.label}
      accessibilityLabel={`${action.label} ${props.agent.label}`}
      role="button"
      tone="accent"
      onPress={action.onPress}
    />
  );
}

type StatusAction = { label: string; onPress: () => void };

function statusAction(props: AgentChoiceProps): StatusAction | undefined {
  const copy = agentStatusCopy(props.agent.status);

  if (!copy?.button) return undefined;

  return pressable(copy.button, agentAction(copy, props));
}

const pressable = (
  label: string,
  onPress: (() => void) | undefined,
): StatusAction | undefined => (onPress ? { label, onPress } : undefined);

// Recheck runs here; every other action opens the Agent's page.
function agentAction(
  copy: Pick<AgentStatusCopy, 'action'>,
  { agent, configuration }: AgentChoiceProps,
): (() => void) | undefined {
  if (copy.action === 'recheck') return configuration.onAgentRetry;
  const setup = configuration.onAgentSetup;

  return setup ? () => setup(agent.agent) : undefined;
}

function agentSubtitle(agent: AgentInfo): { text: string } | undefined {
  const copy = agentStatusCopy(agent.status);

  if (!copy) return undefined;
  const reason = copy.showsReason ? agent.reason : undefined;

  return { text: [copy.label, reason].filter(Boolean).join(' · ') };
}

function selectAgent({
  agent,
  configuration,
  onSelect,
}: AgentChoiceProps): void {
  if (agent.agent !== configuration.agent)
    configuration.onAgentChange?.(agent.agent);
  onSelect();
}
