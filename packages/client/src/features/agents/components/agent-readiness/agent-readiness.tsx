import type * as React from 'react';
import {
  Badge,
  type BadgeTone,
} from '#lib/generic/primitives/display/badge/badge';
import { Text } from '#lib/generic/primitives/display/text/text';
import { FieldSection } from '#lib/generic/primitives/fields/field-section/field-section';
import { ListItem } from '#lib/generic/primitives/lists/list-item/list-item';
import {
  type AgentStatus,
  agentStatusLabels,
  type StatusTone,
  statusTone,
} from '../../state/agent-status';
import {
  type ReadinessAction,
  type ReadinessCopy,
  readinessActionLabels,
  readinessCopy,
} from '../../state/readiness-copy';

export type ReadinessHandlers = {
  onRecheck?: () => void;
  onSignIn?: () => void;
  onRepair?: () => void;
};
export type AgentReadinessProps = ReadinessHandlers & {
  name: string;
  status: AgentStatus;
  reason?: string;
};

const badgeTones: Record<StatusTone, BadgeTone> = {
  success: 'success',
  warning: 'warning',
  destructive: 'destructive',
  pending: 'muted',
};

const chipTone = (status: AgentStatus): BadgeTone | undefined => {
  if (status === 'disabled') return 'muted';
  const tone = statusTone(status);
  return tone && badgeTones[tone];
};
// Whether the status draws a chip; Not installed has none.
export const hasStatusChip = (status: AgentStatus): boolean =>
  chipTone(status) !== undefined;

// The status as a chip beside the Agent's name; Disabled is muted, with no spinner.
export function AgentStatusChip({
  status,
}: {
  status: AgentStatus;
}): React.JSX.Element | null {
  const tone = chipTone(status);
  if (!tone) return null;
  return (
    <Badge tone={tone}>
      <Text>{agentStatusLabels[status]}</Text>
    </Badge>
  );
}

// What the last Readiness check observed and its one action; the reason is the footer.
export function ReadinessSection(
  props: AgentReadinessProps,
): React.JSX.Element | null {
  const copy = readinessCopy(props);
  if (!copy) return null;
  return (
    <FieldSection title="Status" footer={copy.footer} {...footerTone(copy)}>
      <HeadlineRow copy={copy} status={props.status} />
      <ReadinessActionRow {...props} action={copy.action} />
    </FieldSection>
  );
}
const footerTone = ({
  failure,
}: ReadinessCopy): Pick<
  React.ComponentProps<typeof FieldSection>,
  'footerTone'
> => (failure ? { footerTone: 'destructive' } : {});

// A failure reads in red behind a warning; any other status trails its dot, or a spinner while Checking….
function HeadlineRow(props: {
  copy: ReadinessCopy;
  status: AgentStatus;
}): React.JSX.Element {
  const { headline, failure } = props.copy;
  if (failure)
    return <ListItem icon="warning" tone="destructive" title={headline} />;
  const tone = statusTone(props.status);
  return (
    <ListItem
      title={headline}
      status={tone ? { tone, label: '' } : undefined}
    />
  );
}

const handlerFor = (
  action: ReadinessAction,
  handlers: ReadinessHandlers,
): (() => void) | undefined =>
  ({
    'sign-in': handlers.onSignIn,
    'sign-in-again': handlers.onSignIn,
    recheck: handlers.onRecheck,
    repair: handlers.onRepair,
  })[action];

type ActionRowProps = ReadinessHandlers & { action?: ReadinessAction };
// Drawn disabled while the page cannot act, such as during a Recheck; Checking… and Not compatible have none.
function ReadinessActionRow(props: ActionRowProps): React.JSX.Element | null {
  const { action } = props;
  if (!action) return null;
  const onPress = handlerFor(action, props);
  return (
    <ListItem
      {...actionIcon(action)}
      tone="accent"
      title={readinessActionLabels[action]}
      onPress={onPress}
      disabled={!onPress}
    />
  );
}
const actionIcon = (
  action: ReadinessAction,
): Pick<React.ComponentProps<typeof ListItem>, 'icon'> =>
  action === 'recheck' ? { icon: 'retry' } : {};
