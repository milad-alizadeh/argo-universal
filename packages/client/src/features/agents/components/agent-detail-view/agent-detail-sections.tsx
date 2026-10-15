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

// A status that needs a step gets its own section, which then names the status in place of the chip.
export const showsStatusSection = (
  status: AgentDetailViewProps['agent']['status'],
): boolean => status === 'sign-in' || !!statusFooters[status];

// Where an installed Agent stands, when the chip alone does not say what to do.
export function AgentStatusSection(
  props: AgentDetailViewProps,
): React.JSX.Element | null {
  const { status } = props.agent;

  if (!showsStatusSection(status)) return null;

  return status === 'sign-in' ? (
    <SignInSection {...props} />
  ) : (
    <StatusRow {...props} />
  );
}

function StatusRow({ agent }: AgentProps): React.JSX.Element {
  const tone = statusTone(agent.status);

  return (
    <GroupedListSection title="Status" footer={statusFooters[agent.status]}>
      <GroupedListItem
        label={agentStatusLabels[agent.status]}
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
function SignInSection(props: AgentDetailViewProps): React.JSX.Element {
  return (
    <GroupedListSection
      title="Status"
      footer={props.onSignIn ? undefined : signInFooter}
    >
      <GroupedListItem
        label={agentStatusLabels['sign-in']}
        status={{ tone: 'warning', label: '' }}
      />
      <SignInAction {...props} />
      <CheckAgainRow onPress={props.onCheckAgain} />
    </GroupedListSection>
  );
}

function SignInCommand({
  command,
}: {
  command?: string;
}): React.JSX.Element | null {
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

function SignInAction(props: AgentDetailViewProps): React.JSX.Element | null {
  if (props.onSignIn)
    return (
      <GroupedListItem label="Sign in" tone="accent" onPress={props.onSignIn} />
    );

  return <SignInCommand command={props.agent.signInCommand} />;
}

export { AboutSection } from './agent-about-section';
