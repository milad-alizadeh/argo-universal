import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';
import { ListItem, type ListItemProps } from '#primitives/lists/list-item';
import type { ContextMenuTriggerProps } from '#primitives/overlays/menu';
import {
  PullRequestIcon,
  pullRequestStatusLabels,
} from '../pull-request-indicator/pull-request-indicator';
import { SessionMark } from './session-row-mark';
import { type SessionRowProps, sessionRowLabel } from './session-row-props';
import { rowStatusDot } from './session-row-status';

type CompactEndProps = Pick<SessionRowProps, 'session' | 'pullRequest' | 'age'>;

// Its PR's glyph, without the number; with no PR, how long ago the Session was active.
function compactDetail({ pullRequest, age }: CompactEndProps): React.ReactNode {
  if (pullRequest) return <PullRequestIcon status={pullRequest.status} />;

  return age === undefined ? undefined : <Text role="row-detail">{age}</Text>;
}

// A Compact row's end: its detail, then the status dot while the Session is not idle.
function compactTrailing(props: CompactEndProps): React.ReactNode {
  const detail = compactDetail(props);
  const status = rowStatusDot(props.session.status);

  return detail === undefined && status === undefined ? undefined : (
    <View className="flex-row items-center gap-1.5">
      {detail}
      {status}
    </View>
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
): Pick<ListItemProps, 'onPress' | 'onLongPress'> => ({
  onPress: () => props.onSelect(props.session.sessionId),
  onLongPress: props.onLongPress,
});

// Compact: one line, a row of its Project's grouped list on a phone.
export function CompactSessionRow(props: CompactRowProps): React.JSX.Element {
  const selected = props.selected ?? false;

  return (
    <ListItem
      {...compactPresses(props)}
      title={props.session.title}
      accessibilityLabel={compactLabel(props)}
      leading={<SessionMark {...props} />}
      trailing={compactTrailing(props)}
      selected={selected}
    />
  );
}
