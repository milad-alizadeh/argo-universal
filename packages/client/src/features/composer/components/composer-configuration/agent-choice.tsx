import type { AgentAvailability, AgentInfo } from '@repo/contracts';
import type * as React from 'react';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { AgentIcon } from './agent-icon';
import type { ComposerConfigurationProps } from './configuration-types';

// An Agent that is not installed says so and offers no step: installing is not a choice in the list.
const agentAvailability = {
  not_signed_in: {
    label: 'Not signed in',
    button: 'Sign in',
    verb: 'Set up',
    reason: false,
  },
  not_installed: {
    label: 'Not installed',
    button: undefined,
    verb: 'Set up',
    reason: false,
  },
  unavailable: {
    label: 'Unavailable',
    button: 'Retry',
    verb: 'Retry',
    reason: true,
  },
} satisfies Record<
  Exclude<AgentAvailability, 'available'>,
  {
    label: string;
    button: string | undefined;
    verb: 'Set up' | 'Retry';
    reason: boolean;
  }
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

// A desktop menu row's icon sits inside a control; a phone row leads with a list icon.
const agentRowIconRole = { compact: 'row', wide: 'control' } as const;

function AgentSelectionRow(props: AgentChoiceProps): React.JSX.Element {
  return (
    <GroupedListItem
      {...agentSelectionProps(props)}
      leading={<AgentIcon agent={props.agent} role={agentRowIconRole} />}
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
    choice: true,
    onPress: () => selectAgent(props),
  };
}

function agentRowContent(
  agent: AgentInfo,
): React.ComponentProps<typeof GroupedListItem> {
  return {
    label: agent.label,
    accessibilityLabel: `Select ${agent.label}`,
    accessibilityRole: 'button',
    disclosure: false,
    subtitle: agentSubtitle(agent),
  };
}

function AgentAvailabilityAction(
  props: AgentChoiceProps,
): React.JSX.Element | null {
  const action = availabilityAction(props);

  if (!action) return null;

  return (
    <GroupedListItem {...action} accessibilityRole="button" tone="accent" />
  );
}

function availabilityAction({
  agent,
  configuration,
}: AgentChoiceProps): React.ComponentProps<typeof GroupedListItem> | undefined {
  const button = agentButton(agent);
  const onPress = agentAction(agent, configuration);

  if (!button || !onPress) return undefined;

  return { ...button, onPress };
}

function agentButton(
  agent: AgentInfo,
): { label: string; accessibilityLabel: string } | undefined {
  if (agent.availability === 'available') return undefined;
  const { button, verb } = agentAvailability[agent.availability];

  return button === undefined
    ? undefined
    : { label: button, accessibilityLabel: `${verb} ${agent.label}` };
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
