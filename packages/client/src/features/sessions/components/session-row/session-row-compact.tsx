import type * as React from 'react';
import { Text } from '#primitives/display/text';
import { VirtualListItem } from '#primitives/lists/virtual-list-item';
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

// Compact: one line, a row of its Project's grouped list on a phone.
export function CompactSessionRow(props: SessionRowProps): React.JSX.Element {
  const { session, onSelect } = props;
  const selected = props.selected ?? false;

  return (
    <VirtualListItem
      title={session.title}
      accessibilityLabel={compactLabel(props)}
      leading={<SessionMark {...props} selected={selected} />}
      trailing={<CompactTrailing {...props} />}
      position={props.position}
      selected={selected}
      onPress={() => onSelect(session.sessionId)}
    />
  );
}
