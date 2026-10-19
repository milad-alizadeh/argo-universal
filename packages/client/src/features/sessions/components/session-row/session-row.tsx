import { memo } from 'react';
import type * as React from 'react';
import { Text } from '#primitives/content/text';
import { ListItem, type ListItemProps } from '#primitives/lists/list-item';
import type { ContextMenuTriggerProps } from '#primitives/overlays/menu';
import { CompactSessionRow } from './session-row-compact';
import { SessionMark } from './session-row-mark';
import { SessionRowMenu } from './session-row-menu';
import { sessionMetadata } from './session-row-metadata';
import { sessionProgress } from './session-row-plan';
import { type SessionRowProps, sessionRowLabel } from './session-row-props';

export type { SessionRowProps } from './session-row-props';

type SessionRowPressProps = SessionRowProps & ContextMenuTriggerProps;

function sessionTime(text?: string): React.ReactNode {
  return text === undefined ? undefined : (
    <Text role="secondary" tone="muted">
      {text}
    </Text>
  );
}

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

function RegularRow(props: SessionRowPressProps): React.JSX.Element {
  const selected = props.selected ?? false;

  return (
    <ListItem
      {...rowIdentity(props)}
      leading={<SessionMark {...props} selected={selected} />}
      trailing={sessionTime(props.trailing)}
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
