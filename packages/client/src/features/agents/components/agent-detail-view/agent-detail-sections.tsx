import type * as React from 'react';
import { FieldSection } from '#lib/generic/primitives/fields/field-section/field-section';
import { ListItem } from '#lib/generic/primitives/lists/list-item/list-item';
import { CopyButton } from '#lib/product/markdown/copy-button';
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

// Where an installed Agent stands, when the chip alone does not say what to do.
export function AgentStatusSection(
  props: AgentDetailViewProps,
): React.JSX.Element | null {
  const { status } = props.agent;

  if (status === 'sign-in') return <SignInSection {...props} />;

  return statusFooters[status] ? <StatusRow {...props} /> : null;
}

function StatusRow({ agent }: AgentProps): React.JSX.Element {
  const tone = statusTone(agent.status);

  return (
    <FieldSection title="Status" footer={statusFooters[agent.status]}>
      <ListItem
        title="Status"
        value={agentStatusLabels[agent.status]}
        status={tone ? { tone, label: '' } : undefined}
      />
    </FieldSection>
  );
}

/*
 * Signing in happens in a terminal on the Server; the page offers the probe's
 * step and a fresh probe. The step is prose ("Run codex login and sign in…"),
 * not a bare command, so it reads as body text rather than code.
 */
function SignInSection(props: AgentDetailViewProps): React.JSX.Element {
  return (
    <FieldSection
      title="Status"
      footer={props.onSignIn ? undefined : signInFooter}
    >
      <ListItem title="Not signed in" status={{ tone: 'warning', label: '' }} />
      <SignInAction {...props} />
      <CheckAgainRow onPress={props.onCheckAgain} />
    </FieldSection>
  );
}

function SignInCommand({
  command,
}: {
  command?: string;
}): React.JSX.Element | null {
  if (!command) return null;

  return (
    <ListItem
      title={command}
      accessory={
        <CopyButton value={command} label="Copy command" className="size-7" />
      }
    />
  );
}

function SignInAction(props: AgentDetailViewProps): React.JSX.Element | null {
  if (props.onSignIn)
    return <ListItem title="Sign in" tone="accent" onPress={props.onSignIn} />;

  return <SignInCommand command={props.agent.signInCommand} />;
}

export { AboutSection } from './agent-about-section';
