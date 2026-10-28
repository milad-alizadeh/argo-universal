import { Text } from '@repo/kit/primitives/content/text';
import {
  ListItem,
  type ListItemProps,
} from '@repo/kit/primitives/lists/list-item';
import type * as React from 'react';
import { View } from 'react-native';
import {
  ChangeStageIcon,
  ChangeStageModifier,
} from '../change-stage/change-stage';
import { changeDescription } from '../change-stage/change-stage-model';
import { SessionMark } from './session-row-mark';
import { sessionRowMenu } from './session-row-menu';
import {
  hasPluginItems,
  SessionRowPluginItems,
} from './session-row-plugin-items';
import { type SessionRowProps, sessionRowLabel } from './session-row-props';
import { sidebarDrawing } from './session-row-sidebar';
import { compactStatusDot } from './session-row-status';

type CompactEndProps = Pick<
  SessionRowProps,
  'session' | 'pullRequest' | 'age' | 'plugins' | 'onOpenPluginPage'
>;

// Its Change's glyph, without the number; with no Change, how long ago the Session was active.
function compactDetail({ pullRequest, age }: CompactEndProps): React.ReactNode {
  if (pullRequest)
    return (
      <>
        <ChangeStageIcon {...pullRequest} />
        <ChangeStageModifier {...pullRequest} />
      </>
    );

  return age === undefined ? undefined : <Text role="row-detail">{age}</Text>;
}

/*
 * A Compact row's end: its detail, the Plugins' items after it as on a Regular row, then the status dot; a phone draws
 * no dot while the Session is idle, a sidebar row a muted one.
 */
function compactTrailing(props: CompactEndProps): React.ReactNode {
  const detail = compactDetail(props);
  const status = compactStatusDot(props.session.status);
  const drawn = [detail, status].some((part) => part !== undefined);

  if (!drawn && !hasPluginItems(props.plugins)) return undefined;

  return (
    <View className="flex-row items-center gap-1.5">
      {detail}
      <SessionRowPluginItems {...props} />
      {status}
    </View>
  );
}

// The glyph carries no text, so the row's label names the Change's state.
function compactLabel(props: SessionRowProps): string {
  const label = sessionRowLabel(props.session);
  const { pullRequest } = props;

  if (!pullRequest) return label;

  return `${label}, ${changeDescription(pullRequest)} Change`;
}

const compactPresses = (
  props: SessionRowProps,
): Pick<ListItemProps, 'onPress'> => ({
  onPress: () => props.onSelect(props.session.sessionId),
});

// Compact: one line in its compact List, a row of its Project's grouped list on a phone.
export function CompactSessionRow(props: SessionRowProps): React.JSX.Element {
  return (
    <ListItem
      {...compactPresses(props)}
      {...sessionRowMenu(props)}
      title={props.session.title}
      {...sidebarDrawing(props.session.status)}
      accessibilityLabel={compactLabel(props)}
      leading={<SessionMark {...props} />}
      trailing={compactTrailing(props)}
      selected={props.selected ?? false}
      finished={props.session.archivedAt !== null}
    />
  );
}
