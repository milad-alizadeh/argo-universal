import type * as React from 'react';
import { CopyButton } from '#lib/product/markdown/copy-button';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import type { AgentDetailViewProps } from '../../state/agent-detail-types';
import { agentStatusLabels, statusTone } from '../../state/agent-status';
import { CheckAgainRow } from '../check-again-row';

type AgentProps = Pick<AgentDetailViewProps, 'agent'>;

const statusFooters: Partial<
  Record<AgentDetailViewProps['agent']['status'], string>
> = {
  unavailable: 'The Server could not start this Agent. Check again later.',
};

const signInFooter = 'Run this in a terminal on the Server, then check again.';

/*
 * Where an installed Agent stands, when the chip alone does not say what to do.
 * GroupedList takes its sections, and each section its rows, as direct children, so this is called rather than rendered.
 */
export function agentStatusSection(
  props: AgentDetailViewProps,
): React.JSX.Element | null {
  const { status } = props.agent;

  if (status === 'sign-in') return signInSection(props);

  return statusFooters[status] ? statusSection(props) : null;
}

function statusSection({ agent }: AgentProps): React.JSX.Element {
  const tone = statusTone(agent.status);

  return (
    <GroupedListSection title="Status" footer={statusFooters[agent.status]}>
      <GroupedListItem
        label="Status"
        value={agentStatusLabels[agent.status]}
        status={tone ? { tone, label: '' } : undefined}
      />
    </GroupedListSection>
  );
}

/*
 * Signing in happens in a terminal on the Server; the page offers the probe's
 * step and a fresh probe. The step is prose ("Run codex login and sign in…"),
 * not a bare command, so it reads as body text rather than code.
 */
function signInSection(props: AgentDetailViewProps): React.JSX.Element {
  return (
    <GroupedListSection
      title="Status"
      footer={props.onSignIn ? undefined : signInFooter}
    >
      <GroupedListItem
        label="Not signed in"
        status={{ tone: 'warning', label: '' }}
      />
      {signInAction(props)}
      <CheckAgainRow onPress={props.onCheckAgain} />
    </GroupedListSection>
  );
}

function signInCommand(command: string | undefined): React.JSX.Element | null {
  if (!command) return null;

  return (
    <GroupedListItem
      label={command}
      accessory={
        <CopyButton value={command} label="Copy command" className="size-7" />
      }
    />
  );
}

function signInAction(props: AgentDetailViewProps): React.JSX.Element | null {
  if (props.onSignIn)
    return (
      <GroupedListItem label="Sign in" tone="accent" onPress={props.onSignIn} />
    );

  return signInCommand(props.agent.signInCommand);
}

export { aboutSection } from './agent-about-section';
