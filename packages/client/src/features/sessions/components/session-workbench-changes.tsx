import type { ReactElement } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '#primitives/content/text';
import { ChangeStageIcon } from './change-stage/change-stage';
import type { SessionPullRequest } from './session-pull-request';
import { WorkbenchChangeRow } from './session-workbench-change-row';

interface Props {
  changes: readonly SessionPullRequest[];
  onOpen: () => void;
}

const previewLimit = 3;

export function WorkbenchChanges({ changes, onOpen }: Props): ReactElement {
  const preview = changes
    .filter((change) => change.stage === 'open')
    .slice(0, previewLimit);

  const shown = new Set(preview.map((change) => change.number));
  const rest = changes.filter((change) => !shown.has(change.number));

  return (
    <View>
      {previewRows(preview, onOpen)}
      {rest.length > 0 && <MoreChanges changes={rest} onOpen={onOpen} />}
    </View>
  );
}

const previewRows = (
  changes: readonly SessionPullRequest[],
  onOpen: () => void,
): ReactElement[] =>
  changes.map((change) => (
    <WorkbenchChangeRow key={change.number} change={change} onOpen={onOpen} />
  ));

function MoreChanges({ changes, onOpen }: Props): ReactElement {
  return (
    <Pressable
      role="button"
      onPress={onOpen}
      className="flex-row items-center gap-2 rounded-control px-1 py-2 web:hover:bg-hover web:focus-visible:bg-hover"
    >
      <RemainderMarks changes={changes} />
      <Text tone="muted">{remainderLabel(changes)}</Text>
    </Pressable>
  );
}

function RemainderMarks({ changes }: Pick<Props, 'changes'>): ReactElement {
  const stages = [...new Set(changes.map((change) => change.stage))];

  return (
    <View className="min-w-7 shrink-0 flex-row items-center pl-1">
      {stages.slice(0, previewLimit).map((stage, index) => (
        <View key={stage} className={index > 0 ? '-ml-1' : undefined}>
          <View className="size-5 items-center justify-center rounded-full bg-glass">
            <ChangeStageIcon stage={stage} role="control" />
          </View>
        </View>
      ))}
    </View>
  );
}

function remainderLabel(changes: readonly SessionPullRequest[]): string {
  const stages = ['open', 'merged', 'closed', 'branch', 'working'] as const;

  return stages
    .flatMap((stage) => {
      const count = changes.filter((change) => change.stage === stage).length;

      return count
        ? [`${count} ${stage === 'open' ? 'more open' : stage}`]
        : [];
    })
    .join(', ');
}
