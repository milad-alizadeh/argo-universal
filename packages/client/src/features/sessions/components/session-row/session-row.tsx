import {
  ListItem,
  type ListItemProps,
} from '@repo/kit/primitives/lists/list-item';
import type { ContextMenuTriggerProps } from '@repo/kit/primitives/overlays/menu';
import { memo } from 'react';
import type * as React from 'react';
import { CompactSessionRow } from './session-row-compact';
import { SessionMark } from './session-row-mark';
import { SessionRowMenu } from './session-row-menu';
import { sessionMetadata } from './session-row-metadata';
import { sessionProgress } from './session-row-plan';
import { type SessionRowProps, sessionRowLabel } from './session-row-props';
import { sidebarDrawing } from './session-row-sidebar';
import { rowStatusDot } from './session-row-status';

export type { SessionRowProps } from './session-row-props';

type SessionRowPressProps = SessionRowProps & ContextMenuTriggerProps;

type RowIdentity = Pick<
  ListItemProps,
  | 'title'
  | 'subtitle'
  | 'accessibilityLabel'
  | 'onPress'
  | 'onLongPress'
  | 'selected'
>;

function rowIdentity(props: SessionRowPressProps): RowIdentity {
  return {
    title: props.session.title,
    subtitle: props.session.activity,
    accessibilityLabel: sessionRowLabel(props.session),
    onPress: () => props.onSelect(props.session.sessionId),
    onLongPress: props.onLongPress,
    selected: props.selected,
  };
}

// Regular: the time leads the meta line, and a status dot ends the title line.
function RegularRow(props: SessionRowPressProps): React.JSX.Element {
  const selected = props.selected ?? false;

  return (
    <ListItem
      {...rowIdentity(props)}
      {...sidebarDrawing(props.session.status, 'regular')}
      leading={<SessionMark {...props} />}
      trailing={rowStatusDot(props.session.status)}
      meta={sessionMetadata({ ...props, selected })}
      progress={sessionProgress(props.session)}
    />
  );
}

function SessionRowLayout(props: SessionRowPressProps): React.JSX.Element {
  return props.layout === 'compact' ? (
    <CompactSessionRow {...props} />
  ) : (
    <RegularRow {...props} />
  );
}

export const SessionRow = memo(function SessionRow(props: SessionRowProps) {
  return (
    <SessionRowMenu {...props}>
      <SessionRowLayout {...props} />
    </SessionRowMenu>
  );
});
