import {
  ListItem,
  ListItemInert,
  type ListItemProps,
} from '@repo/kit/primitives/lists/list-item';
import type * as React from 'react';
import { SecondaryChangeStageIcon } from '../change-stage/change-stage';
import { changeDescription } from '../change-stage/change-stage-model';
import {
  type CalledRowProps,
  statusUnlessCalled,
  withCallLabel,
} from './session-row-call';
import { endParts, timeOf } from './session-row-ends';
import { SessionMark } from './session-row-mark';
import { sessionRowMenu } from './session-row-menu';
import {
  compactItems,
  hasPluginItems,
  PluginAccessories,
  SessionRowPluginItems,
} from './session-row-plugin-items';
import {
  quietAge,
  type SessionRowPlugins,
  type SessionRowProps,
  sessionRowLabel,
} from './session-row-props';
import { sidebarDrawing, useSidebarRows } from './session-row-sidebar';
import { compactStatusDot } from './session-row-status';

type CompactEndProps = Pick<
  SessionRowProps,
  'session' | 'pullRequest' | 'age' | 'plugins' | 'onOpenPluginPage'
>;

// Its Change's glyph, without the number; with no Change, how long ago a quiet Session was active.
function compactDetail(props: CompactEndProps): React.ReactNode {
  if (props.pullRequest)
    return <SecondaryChangeStageIcon {...props.pullRequest} />;

  return timeOf(quietAge(props));
}

// The status dot, or the Conversation's mark in its place while a call is attached.
const compactStatus = (
  props: CompactEndProps & CalledRowProps,
  sidebar: boolean,
): React.ReactNode =>
  statusUnlessCalled(
    compactStatusDot(props.session.status, sidebar),
    props.call,
  );

/*
 * A Compact row's end: its detail, then the status dot; a phone draws no dot while the Session is idle, a sidebar row
 * a muted one. With Plugin items, the dot follows them as the row's accessories.
 */
function compactEnd(
  props: CompactEndProps & CalledRowProps,
  sidebar: boolean,
): Pick<ListItemProps, 'trailing' | 'trailingAccessories'> {
  const detail = compactDetail(props);
  const status = compactStatus(props, sidebar);

  if (!hasPluginItems(props.plugins))
    return { trailing: endParts(detail, status) };

  return {
    trailing: detail,
    trailingAccessories: (
      <CompactAccessories {...props} plugins={props.plugins} status={status} />
    ),
  };
}

type CompactAccessoriesProps = CompactEndProps & {
  plugins: SessionRowPlugins;
  status: React.ReactNode;
};

// One item fits the line; the rest join "+N", and the dot stays part of the row.
function CompactAccessories(props: CompactAccessoriesProps): React.JSX.Element {
  return (
    <PluginAccessories className="min-w-0 shrink flex-row items-center gap-1.5">
      <SessionRowPluginItems
        plugins={compactItems(props.plugins)}
        onOpenPluginPage={props.onOpenPluginPage}
      />
      <ListItemInert>{props.status}</ListItemInert>
    </PluginAccessories>
  );
}

type CalledCompactRow = SessionRowProps & CalledRowProps;

// The glyph carries no text, so the row's label names the Change's state.
function changeLabel(props: SessionRowProps): string {
  const label = sessionRowLabel(props.session);
  const { pullRequest } = props;

  if (!pullRequest) return label;

  return `${label}, ${changeDescription(pullRequest)} Change`;
}

// The label ends on the Conversation while one is attached.
const compactLabel = (props: CalledCompactRow): string =>
  withCallLabel(changeLabel(props), props.call);

const compactPresses = (
  props: SessionRowProps,
): Pick<ListItemProps, 'onPress'> => ({
  onPress: () => props.onSelect(props.session.sessionId),
});

// Compact: one line in its compact List, a row of its Project's grouped list on a phone.
export function CompactSessionRow(props: CalledCompactRow): React.JSX.Element {
  const sidebar = useSidebarRows();

  return (
    <ListItem
      {...compactPresses(props)}
      {...sessionRowMenu(props)}
      title={props.session.title}
      {...sidebarDrawing(props.session.status, sidebar)}
      accessibilityLabel={compactLabel(props)}
      leading={<SessionMark {...props} />}
      {...compactEnd(props, sidebar)}
      selected={props.selected ?? false}
      finished={props.session.archivedAt !== null}
    />
  );
}
