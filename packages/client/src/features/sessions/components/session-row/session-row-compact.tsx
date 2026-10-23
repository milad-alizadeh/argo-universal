import { Text } from '@repo/kit/primitives/content/text';
import {
  ListItem,
  type ListItemProps,
} from '@repo/kit/primitives/lists/list-item';
import type { ContextMenuTriggerProps } from '@repo/kit/primitives/overlays/menu';
import type * as React from 'react';
import { View } from 'react-native';
import {
  ChangeStageIcon,
  ChangeStageModifier,
} from '../change-stage/change-stage';
import { changeDescription } from '../change-stage/change-stage-model';
import { SessionMark } from './session-row-mark';
import { type SessionRowProps, sessionRowLabel } from './session-row-props';
import { compactGlyphSize, sidebarDrawing } from './session-row-sidebar';
import { compactStatusDot } from './session-row-status';

type CompactEndProps = Pick<SessionRowProps, 'session' | 'pullRequest' | 'age'>;

// Its Change's glyph, without the number; with no Change, how long ago the Session was active.
function compactDetail({ pullRequest, age }: CompactEndProps): React.ReactNode {
  if (pullRequest)
    return (
      <>
        <ChangeStageIcon {...pullRequest} size={compactGlyphSize} />
        <ChangeStageModifier {...pullRequest} />
      </>
    );

  return age === undefined ? undefined : <Text role="row-detail">{age}</Text>;
}

// A Compact row's end: its detail, then the status dot; a phone draws no dot while the Session is idle, a sidebar row a muted one.
function compactTrailing(props: CompactEndProps): React.ReactNode {
  const detail = compactDetail(props);
  const status = compactStatusDot(props.session.status);

  if (detail === undefined && status === undefined) return undefined;

  return (
    <View className="flex-row items-center gap-1.5">
      {detail}
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
      {...sidebarDrawing(props.session.status, 'compact')}
      accessibilityLabel={compactLabel(props)}
      leading={<SessionMark {...props} />}
      trailing={compactTrailing(props)}
      selected={selected}
    />
  );
}
