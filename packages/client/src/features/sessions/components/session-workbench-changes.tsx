import type { ReactElement } from 'react';
import { Pressable, View } from 'react-native';
import {
  StackedSummary,
  type StackedSummaryIcon,
} from '../../../lib/product/stacked-summary';
import { ChangeRow } from './change-row';
import { resolveChangeStage } from './change-stage/change-stage-model';
import type { SessionPullRequest } from './session-pull-request';

interface Props {
  changes: readonly SessionPullRequest[];
  onOpen: () => void;
}

const previewLimit = 3;

// The open Changes the card previews, and the rest, which its footer groups by stage.
interface ChangeSplit {
  preview: SessionPullRequest[];
  rest: SessionPullRequest[];
}

function splitChanges(changes: readonly SessionPullRequest[]): ChangeSplit {
  const preview = changes
    .filter((change) => change.stage === 'open')
    .slice(0, previewLimit);

  const shown = new Set(preview.map((change) => change.number));

  return {
    preview,
    rest: changes.filter((change) => !shown.has(change.number)),
  };
}

export function WorkbenchChangeRows({ changes, onOpen }: Props): ReactElement {
  return <View>{previewRows(splitChanges(changes).preview, onOpen)}</View>;
}

// The footer of the Changes card: absent when every Change is already previewed.
export function WorkbenchMoreChanges({
  changes,
  onOpen,
}: Props): ReactElement | null {
  const { rest } = splitChanges(changes);

  return rest.length > 0 ? (
    <MoreChanges changes={rest} onOpen={onOpen} />
  ) : null;
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
        icons={remainderIcons(changes)}
        texts={remainderTexts(changes)}
      />
    </Pressable>
  );
}

function remainderIcons(
  changes: readonly SessionPullRequest[],
): StackedSummaryIcon[] {
  return changes.map(({ stage }) => resolveChangeStage({ stage }));
}

function remainderTexts(changes: readonly SessionPullRequest[]): string[] {
  const stages = ['open', 'merged', 'closed', 'branch', 'working'] as const;

  return stages.flatMap((stage) => {
    const count = changes.filter((change) => change.stage === stage).length;

    return count ? [`${count} ${stage === 'open' ? 'more open' : stage}`] : [];
  });
}
