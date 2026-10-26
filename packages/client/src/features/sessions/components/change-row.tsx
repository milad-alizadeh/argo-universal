import type { ChangesSummary } from '@repo/contracts';
import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import { Text } from '@repo/kit/primitives/content/text';
import { Menu } from '@repo/kit/primitives/overlays/menu';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { ChangeChecks } from './change-checks-popover';
import { ChangeDiffTotal } from './change-diff-total';
import { ChangePart } from './change-part';
import {
  ChangeStageIcon,
  ChangeStageModifier,
} from './change-stage/change-stage';
import type { SessionPullRequest } from './session-pull-request';

export interface ChangeRowProps {
  change: SessionPullRequest;
  // Open the Change in the Inspector.
  onOpen: () => void;
}

export function ChangeRow(props: ChangeRowProps): ReactElement {
  return (
    <View className="flex-row items-start gap-2 rounded-xl px-1 py-2">
      <View className="w-7 shrink-0 items-center pt-0.5">
        <ChangeStageIcon {...props.change} />
      </View>
      <ChangeText {...props} />
      <ChangeMenu {...props} />
    </View>
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

// Only these parts press: the files open the Change in the Inspector, the checks list each check.
function ChangeMeta({ change, onOpen }: ChangeRowProps): ReactElement {
  return (
    <View className="min-h-6 flex-row flex-wrap items-center gap-2">
      {change.summary && (
        <ChangeFiles {...change.summary} change={change} onOpen={onOpen} />
      )}
      {change.checks && <ChangeChecks checks={change.checks} onOpen={onOpen} />}
      <ChangeStageModifier {...change} />
    </View>
  );
}

function ChangeFiles({
  change,
  onOpen,
  ...summary
}: ChangesSummary & ChangeRowProps): ReactElement {
  return (
    <ChangePart
      accessibilityLabel={`Open files of Change #${change.number}`}
      onPress={onOpen}
    >
      <ChangeDiffTotal {...summary} icon />
    </ChangePart>
  );
}

function ChangeMenu({ change, onOpen }: ChangeRowProps): ReactElement {
  const label = `Change #${change.number} actions`;

  return (
    <View className="h-5 w-8 shrink-0 items-center justify-center">
      <Menu
        accessibilityLabel={label}
        trigger={menuTrigger(label)}
        actions={[{ label: 'Open Changes in Inspector', onPress: onOpen }]}
      />
    </View>
  );
}

const menuTrigger = (label: string): ReactElement => (
  <IconButton
    icon="more"
    accessibilityLabel={label}
    variant="ghost"
    size="sm"
  />
);
