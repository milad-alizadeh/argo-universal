import type { AgentCheck } from '@repo/contracts';
import type * as React from 'react';
import { Badge, type BadgeTone } from '#primitives/display/badge';
import { Text } from '#primitives/display/text';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { CheckAgainRow } from '../check-again-row';
import { sectionFooter } from '../form-field';

// undefined while the Server runs a fresh ACP initialize; readiness is never read from the saved record.
export type CustomAgentCheck = AgentCheck | undefined;

type StatusProps = {
  check: CustomAgentCheck;
  onCheck: () => void;
  onSignIn?: () => void;
};

export function ReadinessChip({
  check,
}: {
  check: CustomAgentCheck;
}): React.JSX.Element {
  if (!check) return <CheckingChip />;

  if (check.status === 'ready') return <CheckedChip check={check} />;

  return <FailedChip />;
}

const Chip = (props: { label: string; tone: BadgeTone }): React.JSX.Element => (
  <Badge tone={props.tone}>
    <Text>{props.label}</Text>
  </Badge>
);

const CheckingChip = (): React.JSX.Element => (
  <Chip label="Checking" tone="muted" />
);

const ReadyChip = (): React.JSX.Element => (
  <Chip label="Ready" tone="success" />
);

const FailedChip = (): React.JSX.Element => (
  <Chip label="Check failed" tone="destructive" />
);

const failureOf = (check: CustomAgentCheck): string | undefined =>
  check?.status === 'failed' ? check.failure : undefined;

// The last ACP initialize: running, answered, or what failed and a row to run it again.
export function ReadinessSection(props: StatusProps): React.JSX.Element {
  const { check, onCheck, onSignIn } = props;
  const failure = failureOf(check);

  return (
    <GroupedListSection title="Status" {...sectionFooter(failure)}>
      <StatusRow check={check} />
      {onSignIn && (
        <GroupedListItem title="Sign in" tone="accent" onPress={onSignIn} />
      )}
      {failure !== undefined && <CheckAgainRow onPress={onCheck} />}
    </GroupedListSection>
  );
}

function StatusRow({ check }: { check: CustomAgentCheck }): React.JSX.Element {
  if (!check)
    return <GroupedListItem title="Running ACP initialize…" loading />;

  if (check.status === 'ready') return <CheckedRow check={check} />;

  return (
    <GroupedListItem
      icon="warning"
      tone="destructive"
      title="Did not answer ACP initialize"
    />
  );
}

type Checked = Extract<AgentCheck, { status: 'ready' }>;

const authenticationLabels = {
  required: 'Sign-in required',
  unverified: 'Account could not be verified',
} as const;

function CheckedChip({ check }: { check: Checked }): React.JSX.Element {
  if (!check.authentication) return <ReadyChip />;

  return (
    <Chip label={authenticationLabels[check.authentication]} tone="warning" />
  );
}

function CheckedRow({ check }: { check: Checked }): React.JSX.Element {
  if (!check.authentication)
    return <GroupedListItem icon="check" title="Answered ACP initialize" />;

  return (
    <GroupedListItem
      icon="warning"
      title={authenticationLabels[check.authentication]}
      status={{ tone: 'warning', label: '' }}
    />
  );
}
