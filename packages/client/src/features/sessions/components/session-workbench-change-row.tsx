import type { ReactElement } from 'react';
import { Pressable, View } from 'react-native';
import { IconButton } from '#primitives/actions/icon-button';
import { Text } from '#primitives/content/text';
import { Menu } from '#primitives/overlays/menu';
import { ChangeDiffTotal } from './change-diff-total';
import {
  ChangeStageIcon,
  ChangeStageModifier,
} from './change-stage/change-stage';
import { PullRequestChecks } from './pull-request-checks';
import type { SessionPullRequest } from './session-pull-request';

type Props = { change: SessionPullRequest; onOpen: () => void };

export function WorkbenchChangeRow(props: Props): ReactElement {
  return (
    <View className="flex-row items-start gap-2 px-1 py-2">
      <ChangeAction {...props} />
      <ChangeMenu {...props} />
    </View>
  );
}

function ChangeAction({ change, onOpen }: Props): ReactElement {
  return (
    <Pressable
      role="button"
      accessibilityLabel={`Open Change #${change.number}`}
      onPress={onOpen}
      className="min-w-0 flex-1 flex-row items-start gap-2 rounded-control web:hover:bg-hover web:focus-visible:bg-hover"
    >
      <View className="w-7 shrink-0 items-center pt-0.5">
        <ChangeStageIcon {...change} role="control" />
      </View>
      <ChangeText change={change} />
    </Pressable>
  );
}

function ChangeText({ change }: Pick<Props, 'change'>): ReactElement {
  return (
    <View className="min-w-0 flex-1 gap-0.5">
      <View className="flex-row items-center gap-1.5">
        <Text tone="muted">#{change.number}</Text>
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1}>{change.title}</Text>
        </View>
      </View>
      <ChangeMeta change={change} />
    </View>
  );
}

function ChangeMeta({ change }: Pick<Props, 'change'>): ReactElement {
  return (
    <View className="min-h-6 flex-row flex-wrap items-center gap-2">
      {change.summary && <ChangeDiffTotal {...change.summary} icon />}
      {change.checks && <PullRequestChecks {...change.checks} compact />}
      <ChangeStageModifier {...change} />
    </View>
  );
}

function ChangeMenu({ change, onOpen }: Props): ReactElement {
  const label = `Change #${change.number} actions`;

  return (
    <View className="h-5 w-8 shrink-0 items-center justify-center">
      <Menu
        accessibilityLabel={label}
        trigger={menuTrigger(label)}
        actions={[{ label: 'Open Changes in Stage', onPress: onOpen }]}
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
