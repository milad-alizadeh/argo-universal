import type { AgentAvailability, AgentInfo } from '@repo/contracts';
import type * as React from 'react';
import { SelectedCheck } from '#primitives/display/selected-check';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import { AgentIcon } from './agent-icon';
import type { ComposerConfigurationProps } from './configuration-types';

const agentAvailability = {
  not_signed_in: {
    label: 'Not signed in',
    button: 'Sign in',
    action: 'setup',
    reason: false,
  },
  not_installed: {
    label: 'Not installed',
    button: 'Install',
    action: 'setup',
    reason: false,
  },
  unavailable: {
    label: 'Unavailable',
    button: 'Retry',
    action: 'retry',
    reason: true,
  },
} satisfies Record<
  Exclude<AgentAvailability, 'available'>,
  { label: string; button: string; action: 'setup' | 'retry'; reason: boolean }
>;

interface AgentChoiceProps {
  agent: AgentInfo;
  configuration: ComposerConfigurationProps;
  onSelect: () => void;
}

export function AgentChoice(props: AgentChoiceProps): React.JSX.Element {
  return (
    <>
      <AgentSelectionRow {...props} />
      <AgentAvailabilityAction {...props} />
    </>
  );
}

function AgentSelectionRow(props: AgentChoiceProps): React.JSX.Element {
  const wide = useWide();

  return (
    <GroupedListItem
      {...agentSelectionProps(props)}
      leading={
        <AgentIcon agent={props.agent} role={wide ? 'control' : 'row'} />
      }
    />
  );
}

function agentSelectionProps(
  props: AgentChoiceProps,
): React.ComponentProps<typeof GroupedListItem> {
  const { agent, configuration } = props;
  const selected = agent.agent === configuration.agent;

  return {
    ...agentRowContent(agent),
    disabled:
      !configuration.onAgentChange || agent.availability !== 'available',
    selected,
    accessory: selected ? <SelectedCheck /> : undefined,
    onPress: () => selectAgent(props),
  };
}

function agentRowContent(
  agent: AgentInfo,
): React.ComponentProps<typeof GroupedListItem> {
  return {
    title: agent.label,
    accessibilityLabel: `Select ${agent.label}`,
    role: 'button',
    disclosure: false,
    subtitle: agentSubtitle(agent),
  };
}

function AgentAvailabilityAction(
  props: AgentChoiceProps,
): React.JSX.Element | null {
  if (props.agent.availability === 'available') return null;
  const action = agentAction(props.agent, props.configuration);

  if (!action) return null;

  return (
    <GroupedListItem
      {...agentActionContent(props.agent)}
      role="button"
      tone="accent"
      onPress={action}
    />
  );
}

function agentActionContent(
  agent: AgentInfo,
): React.ComponentProps<typeof GroupedListItem> {
  if (agent.availability === 'available') return { title: agent.label };
  const unavailable = agentAvailability[agent.availability];

  return {
    title: unavailable.button,
    accessibilityLabel: `${unavailable.action === 'retry' ? 'Retry' : 'Set up'} ${agent.label}`,
  };
}

function agentAction(
  agent: AgentInfo,
  configuration: ComposerConfigurationProps,
): (() => void) | undefined {
  if (agent.availability === 'unavailable') return configuration.onAgentRetry;

  return configuration.onAgentSetup
    ? () => configuration.onAgentSetup?.(agent.agent)
    : undefined;
}

function agentSubtitle(agent: AgentInfo): { text: string } | undefined {
  if (agent.availability === 'available') return undefined;
  const unavailable = agentAvailability[agent.availability];

  return {
    text: [unavailable.label, unavailable.reason && agent.installStep]
      .filter(Boolean)
      .join(' · '),
  };
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
