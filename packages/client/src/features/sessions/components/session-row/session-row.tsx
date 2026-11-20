import {
  ListItem,
  type ListItemProps,
} from '@repo/kit/primitives/lists/list-item';
import { memo } from 'react';
import type * as React from 'react';
import {
  type CalledRowProps,
  useSessionRowCall,
  withCallLabel,
} from './session-row-call';
import { CompactSessionRow } from './session-row-compact';
import { regularEnds } from './session-row-ends';
import { SessionMark } from './session-row-mark';
import { sessionRowMenu } from './session-row-menu';
import { sessionMetaLine } from './session-row-meta-line';
import { type SessionRowProps, sessionRowLabel } from './session-row-props';
import { sidebarDrawing } from './session-row-sidebar';
import { sessionProgress } from './session-row-todos';

export type { SessionRowProps } from './session-row-props';

type RowIdentity = Pick<
  ListItemProps,
  | 'title'
  | 'subtitle'
  | 'subtitleIcon'
  | 'accessibilityLabel'
  | 'onPress'
  | 'selected'
  | 'finished'
>;

// The chosen Plugin's Activity line, led by its glyph, when it has one for this Session; Argo's own, bare, otherwise.
function activityLine({
  plugins,
  session,
}: SessionRowProps): Pick<ListItemProps, 'subtitle' | 'subtitleIcon'> {
  const activity = plugins?.activity;

  if (!activity) return { subtitle: session.activity };

  return { subtitle: activity.text, subtitleIcon: activity.icon };
}

type CalledRow = SessionRowProps & CalledRowProps;

function rowIdentity(props: CalledRow): RowIdentity {
  return {
    title: props.session.title,
    ...activityLine(props),
    accessibilityLabel: withCallLabel(
      sessionRowLabel(props.session),
      props.call,
    ),
    onPress: () => props.onSelect(props.session.sessionId),
    selected: props.selected,
    finished: props.session.archivedAt !== null,
  };
}

// Regular: two lines with the Session's status and time, then a meta line while it has anything to show.
function RegularRow(props: CalledRow): React.JSX.Element {
  const identity = rowIdentity(props);

  return (
    <ListItem
      {...identity}
      {...sessionRowMenu(props)}
      {...sidebarDrawing(props.session.status)}
      leading={<SessionMark {...props} />}
      {...regularEnds(props, identity.subtitle)}
      metaAccessories={sessionMetaLine(props)}
      progress={sessionProgress(props.session)}
    />
  );
}

// A Voice call attached to the Session takes the status's place in either layout and joins the row's label.
function SessionRowLayout(props: SessionRowProps): React.JSX.Element {
  const call = useSessionRowCall(props.session.sessionId);

  return props.layout === 'compact' ? (
    <CompactSessionRow {...props} call={call} />
  ) : (
    <RegularRow {...props} call={call} />
  );
}

export const SessionRow = memo(function SessionRow(props: SessionRowProps) {
  return <SessionRowLayout {...props} />;
});
