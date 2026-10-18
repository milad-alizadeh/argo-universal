import type * as React from 'react';
import { Text } from '#primitives/content/text';
import {
  VirtualListItem,
  type VirtualListItemProps,
} from '#primitives/lists/virtual-list-item';
import type { ContextMenuTriggerProps } from '#primitives/overlays/menu';
import {
  PullRequestIcon,
  pullRequestStatusLabels,
} from '../pull-request-indicator/pull-request-indicator';
import { SessionMark } from './session-row-mark';
import { type SessionRowProps, sessionRowLabel } from './session-row-props';

type CompactEndProps = Pick<SessionRowProps, 'pullRequest' | 'trailing'>;

// A Compact row's end: its PR's glyph, without the number; with no PR, how long ago the Session was active.
function CompactTrailing({
  pullRequest,
  trailing,
}: CompactEndProps): React.ReactNode {
  if (pullRequest) return <PullRequestIcon status={pullRequest.status} />;

  return trailing === undefined ? undefined : (
    <Text role="row-detail">{trailing}</Text>
  );
}

// The glyph carries no text, so the row's label names the PR's state.
function compactLabel(props: SessionRowProps): string {
  const label = sessionRowLabel(props.session);
  const { pullRequest } = props;

  if (!pullRequest) return label;

  return `${label}, ${pullRequestStatusLabels[pullRequest.status]} PR`;
}

// The row opens its Session; Android's context menu hands it its long press.
type CompactRowProps = SessionRowProps & ContextMenuTriggerProps;

const compactPresses = (
  props: CompactRowProps,
): Pick<VirtualListItemProps, 'onPress' | 'onLongPress'> => ({
  onPress: () => props.onSelect(props.session.sessionId),
  onLongPress: props.onLongPress,
});

// Compact: one line, a row of its Project's grouped list on a phone.
export function CompactSessionRow(props: CompactRowProps): React.JSX.Element {
  const selected = props.selected ?? false;

  return (
    <VirtualListItem
      {...compactPresses(props)}
      title={props.session.title}
      accessibilityLabel={compactLabel(props)}
      leading={<SessionMark {...props} selected={selected} />}
      trailing={<CompactTrailing {...props} />}
      position={props.position}
      selected={selected}
    />
  );
}
