import { Text } from '@repo/kit/primitives/content/text';
import type { ReactElement } from 'react';
import { Pressable, View } from 'react-native';
import { ChangeChecks } from './change-checks-popover';
import { ChangeDiffTotal } from './change-diff-total';
import {
  ChangeStageIcon,
  ChangeStageModifier,
} from './change-stage/change-stage';
import type { SessionPullRequest } from './session-pull-request';

export interface ChangeRowProps {
  change: SessionPullRequest;
  // Open the Change on its code host.
  onOpen: () => void;
}

const rowClassName =
  'flex-row items-start gap-2 rounded-xl px-1 py-2 web:hover:bg-hover web:focus-visible:bg-hover';

const stageCell = (change: SessionPullRequest): ReactElement => (
  <View className="w-7 shrink-0 items-center pt-0.5">
    <ChangeStageIcon {...change} />
  </View>
);

export function ChangeRow(props: ChangeRowProps): ReactElement {
  return (
    <Pressable
      role="button"
      accessibilityLabel={`Open Change #${props.change.number} on GitHub`}
      onPress={props.onOpen}
      className={rowClassName}
    >
      {stageCell(props.change)}
      <ChangeText {...props} />
    </Pressable>
  );
}

function ChangeText({ change, onOpen }: ChangeRowProps): ReactElement {
  return (
    <View className="min-w-0 flex-1 gap-0.5">
      <View className="flex-row items-center gap-1.5">
        <Text tone="muted">#{change.number}</Text>
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1}>{change.title}</Text>
        </View>
      </View>
      <ChangeMeta change={change} onOpen={onOpen} />
    </View>
  );
}

// The checks list each check on the web; every other part of the row opens the Change.
function ChangeMeta({ change, onOpen }: ChangeRowProps): ReactElement {
  return (
    <View className="min-h-6 flex-row flex-wrap items-center gap-2">
      {change.summary && <ChangeDiffTotal {...change.summary} icon />}
      {change.checks && <ChangeChecks checks={change.checks} onOpen={onOpen} />}
      <ChangeStageModifier {...change} />
    </View>
  );
}
