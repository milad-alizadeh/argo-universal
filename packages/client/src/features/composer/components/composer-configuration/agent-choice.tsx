import type { AgentAvailability, AgentInfo } from '@repo/contracts';
import type * as React from 'react';
import { SelectedCheck } from '#primitives/display/selected-check';
import { ListItem } from '#primitives/lists/list-item/list-item';
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
export function AgentChoice({
  agent,
  configuration,
  onSelect,
}: {
  agent: AgentInfo;
  configuration: ComposerConfigurationProps;
  onSelect: () => void;
}): React.JSX.Element {
  const wide = useWide();
  const unavailable =
    agent.availability === 'available'
      ? undefined
      : agentAvailability[agent.availability];
  const setup = configuration.onAgentSetup
    ? (): void => configuration.onAgentSetup?.(agent.agent)
    : undefined;
  const action =
    unavailable?.action === 'retry' ? configuration.onAgentRetry : setup;
  return (
    <>
      <ListItem
        title={agent.label}
        accessibilityLabel={`Select ${agent.label}`}
        leading={<AgentIcon agent={agent} size={wide ? 'sm' : 'lg'} />}
        role="button"
        disclosure={false}
        subtitle={agentSubtitle(agent)}
        disabled={!configuration.onAgentChange || !!unavailable}
        selected={agent.agent === configuration.agent}
        accessory={
          agent.agent === configuration.agent ? <SelectedCheck /> : undefined
        }
        onPress={() => {
          if (agent.agent !== configuration.agent)
            configuration.onAgentChange?.(agent.agent);
          onSelect();
        }}
      />
      {unavailable && action ? (
        <ListItem
          title={unavailable.button}
          accessibilityLabel={`${unavailable.action === 'retry' ? 'Retry' : 'Set up'} ${agent.label}`}
          role="button"
          tone="accent"
          onPress={action}
        />
      ) : null}
    </>
  );
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
