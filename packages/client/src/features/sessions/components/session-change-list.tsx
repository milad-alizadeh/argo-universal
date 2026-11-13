import { tintTransitionClassName } from '@repo/kit/motion';
import { Text } from '@repo/kit/primitives/content/text';
import { cn } from '@repo/kit/utils';
import type { ReactElement } from 'react';
import { Pressable, View } from 'react-native';
import { changeKey, changeName } from './change-identity';
import {
  ChangeStageIcon,
  ChangeStageModifier,
} from './change-stage/change-stage';
import { changeDescription } from './change-stage/change-stage-model';
import type { SessionPullRequest } from './session-pull-request';

export interface SessionChangeListProps {
  // Every Change the Session has, in the order the Plugins gave them, whatever its stage.
  changes: readonly SessionPullRequest[];
  // A row opens that Change's detail.
  onSelect: (change: SessionPullRequest) => void;
}

type RowProps = Pick<SessionChangeListProps, 'onSelect'> & {
  change: SessionPullRequest;
};

const rowClasses = cn(
  'min-h-9 flex-row items-start gap-3 rounded-lg px-3 py-2 web:hover:bg-hover web:active:bg-pressed web:focus-visible:outline-2 web:focus-visible:outline-focus web:focus-visible:-outline-offset-2',
  tintTransitionClassName,
);

function RowText({ change }: Pick<RowProps, 'change'>): ReactElement {
  return (
    <View className="min-w-0 flex-1 gap-0.5">
      <Text numberOfLines={1}>{change.title}</Text>
      <View className="flex-row flex-wrap items-center gap-x-2">
        <Text role="secondary" tone="muted" numberOfLines={1}>
          {changeName(change)}
        </Text>
        <ChangeStageModifier {...change} />
      </View>
    </View>
  );
}

const rowLabel = (change: SessionPullRequest): string =>
  `Show Change ${changeName(change)}, ${change.title}, ${changeDescription(change)}`;

function Row({ change, onSelect }: RowProps): ReactElement {
  return (
    <Pressable
      role="button"
      accessibilityLabel={rowLabel(change)}
      onPress={() => onSelect(change)}
      className={rowClasses}
    >
      <View className="w-7 shrink-0 items-center pt-0.5">
        <ChangeStageIcon {...change} />
      </View>
      <RowText change={change} />
    </Pressable>
  );
}

// The Inspector's Changes list: every Change the Session has, which a row opens (ADR-0039).
export function SessionChangeList(props: SessionChangeListProps): ReactElement {
  const row = (change: SessionPullRequest): ReactElement => (
    <Row key={changeKey(change)} change={change} onSelect={props.onSelect} />
  );

  return (
    <View className="p-2" accessibilityLabel="Changes">
      {props.changes.map(row)}
    </View>
  );
}
