import type { ReactElement } from 'react';
import { Pressable, View } from 'react-native';
import {
  StackedSummary,
  type SummaryMark,
} from '../../../lib/product/stacked-summary';
import { ChangeRow } from './change-row';
import { resolveChangeStage } from './change-stage/change-stage-model';
import type { SessionPullRequest } from './session-pull-request';

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
    <ChangeRow key={change.number} change={change} onOpen={onOpen} />
  ));

function MoreChanges({ changes, onOpen }: Props): ReactElement {
  return (
    <Pressable
      role="button"
      onPress={onOpen}
      className="rounded-control web:hover:bg-hover web:focus-visible:bg-hover"
    >
      <StackedSummary
        marks={remainderMarks(changes)}
        label={remainderLabel(changes)}
      />
    </Pressable>
  );
}

function remainderMarks(changes: readonly SessionPullRequest[]): SummaryMark[] {
  return [...new Set(changes.map((change) => change.stage))].map((stage) => ({
    key: stage,
    ...resolveChangeStage({ stage }),
    surface: 'glass',
  }));
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
