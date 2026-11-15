import { IconSlot } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import type { ReactElement } from 'react';
import { Pressable, View } from 'react-native';
import { ChangeChecks } from './change-checks-popover';
import { ChangeDiffTotal } from './change-diff-total';
import { ChangeContextMenu, ChangeMenu } from './change-row-menu';
import {
  ChangeStageIcon,
  ChangeStageModifier,
} from './change-stage/change-stage';
import type { SessionPullRequest } from './session-pull-request';

export interface ChangeRowProps {
  change: SessionPullRequest;
  // Open the Change on its code host.
  onOpen: () => void;
  // Copy the Change's link, and take it off the Session; the menu leaves out an item with no handler.
  onCopyLink?: () => void;
  onDetach?: () => void;
  // Ticks or unticks an automation the Change offers; the menu leaves the automation items out without it.
  onSetAutomation?: SessionPullRequest['onSetAutomation'];
}

const rowClassName = 'flex-row items-start gap-2 px-1 py-2';

// The mark takes its glyph's own width, as every Workbench card's leading mark does, centred on the title line.
const stageCell = (change: SessionPullRequest): ReactElement => (
  <View className="mt-0.5 shrink-0">
    <IconSlot>
      <ChangeStageIcon {...change} />
    </IconSlot>
  </View>
);

export function ChangeRow(props: ChangeRowProps): ReactElement {
  return (
    <ChangeContextMenu {...props}>
      <View className={rowClassName}>
        {stageCell(props.change)}
        <View className="min-w-0 flex-1 gap-0.5">
          <ChangeTitle {...props} />
          <ChangeMeta {...props} />
        </View>
        <ChangeMenu {...props} />
      </View>
    </ChangeContextMenu>
  );
}

// The title is the link to the Change; a pointer over it underlines it (the decoration reaches the Text from its parent), the rest of the row stays still.
function ChangeTitle({ change, onOpen }: ChangeRowProps): ReactElement {
  return (
    <Pressable
      role="button"
      accessibilityLabel={`Open Change #${change.number} on GitHub`}
      onPress={onOpen}
      className="max-w-full self-start web:hover:underline"
    >
      <Text numberOfLines={1}>{change.title}</Text>
    </Pressable>
  );
}

const checksPart = (
  checks: NonNullable<SessionPullRequest['checks']>,
  onOpen: () => void,
): ReactElement => (
  <View className="ml-auto">
    <ChangeChecks checks={checks} onOpen={onOpen} />
  </View>
);

// The number and the diff total, with the checks at the trailing edge; the checks list each check on the web, and on a phone open the Change.
function ChangeMeta({ change, onOpen }: ChangeRowProps): ReactElement {
  return (
    <View className="min-h-6 flex-row flex-wrap items-center gap-2">
      <Text role="secondary" tone="muted">
        #{change.number}
      </Text>
      {change.summary && <ChangeDiffTotal {...change.summary} icon />}
      <ChangeStageModifier {...change} />
      {change.checks && checksPart(change.checks, onOpen)}
    </View>
  );
}
