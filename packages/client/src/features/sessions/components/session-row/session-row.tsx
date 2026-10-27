import {
  ListItem,
  type ListItemProps,
} from '@repo/kit/primitives/lists/list-item';
import { memo } from 'react';
import type * as React from 'react';
import { CompactSessionRow } from './session-row-compact';
import { SessionMark } from './session-row-mark';
import { sessionRowMenu } from './session-row-menu';
import { sessionMetadata } from './session-row-metadata';
import { sessionProgress } from './session-row-plan';
import { type SessionRowProps, sessionRowLabel } from './session-row-props';
import { sidebarDrawing } from './session-row-sidebar';
import { rowStatusDot } from './session-row-status';

export type { SessionRowProps } from './session-row-props';

type RowIdentity = Pick<
  ListItemProps,
  | 'title'
  | 'subtitle'
  | 'accessibilityLabel'
  | 'onPress'
  | 'selected'
  | 'finished'
>;

function rowIdentity(props: SessionRowProps): RowIdentity {
  return {
    title: props.session.title,
    subtitle: props.session.activity,
    accessibilityLabel: sessionRowLabel(props.session),
    onPress: () => props.onSelect(props.session.sessionId),
    selected: props.selected,
    finished: props.session.archivedAt !== null,
  };
}

// Regular: the time leads the meta line, and a status dot ends the title line.
function RegularRow(props: SessionRowProps): React.JSX.Element {
  const selected = props.selected ?? false;

  return (
    <ListItem
      {...rowIdentity(props)}
      {...sessionRowMenu(props)}
      {...sidebarDrawing(props.session.status)}
      leading={<SessionMark {...props} />}
      trailing={rowStatusDot(props.session.status)}
      meta={sessionMetadata({ ...props, selected })}
      progress={sessionProgress(props.session)}
    />
  );
}

function SessionRowLayout(props: SessionRowProps): React.JSX.Element {
  return props.layout === 'compact' ? (
    <CompactSessionRow {...props} />
  ) : (
    <RegularRow {...props} />
  );
}

export const SessionRow = memo(function SessionRow(props: SessionRowProps) {
  return <SessionRowLayout {...props} />;
});
