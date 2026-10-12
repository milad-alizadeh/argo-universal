import type { AgentCheck } from '@repo/contracts';
import type * as React from 'react';
import { Badge, type BadgeTone } from '#lib/generic/primitives/badge';
import { Text } from '#lib/generic/primitives/text';
import { FieldSection } from '#primitives/field-section';
import { ListItem } from '#primitives/list-item';
import { CheckAgainRow } from './check-again-row';
import { sectionFooter } from './form-field';

// undefined while the Server runs a fresh ACP initialize; readiness is never read from the saved record.
export type CustomAgentCheck = AgentCheck | undefined;
type StatusProps = { check: CustomAgentCheck; onCheck: () => void };

export function ReadinessChip({
  check,
}: {
  check: CustomAgentCheck;
}): React.JSX.Element {
  if (!check) return <CheckingChip />;
  if (check.status === 'ready') return <ReadyChip />;
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
export function ReadinessSection({
  check,
  onCheck,
}: StatusProps): React.JSX.Element {
  const failure = failureOf(check);
  return (
    <FieldSection title="Status" {...sectionFooter(failure)}>
      <StatusRow check={check} />
      {failure !== undefined && <CheckAgainRow onPress={onCheck} />}
    </FieldSection>
  );
}

function StatusRow({ check }: { check: CustomAgentCheck }): React.JSX.Element {
  if (!check) return <ListItem title="Running ACP initialize…" loading />;
  if (check.status === 'ready')
    return <ListItem icon="check" title="Answered ACP initialize" />;
  return (
    <ListItem
      icon="warning"
      tone="destructive"
      title="Did not answer ACP initialize"
    />
  );
}
