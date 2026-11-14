import type { ReactElement } from 'react';
import { Pressable, View } from 'react-native';
import {
  StackedSummary,
  type StackedSummaryIcon,
} from '../../../lib/product/stacked-summary';
import { changeKey } from './change-identity';
import { ChangeRow } from './change-row';
import { resolveChangeStage } from './change-stage/change-stage-model';
import type { SessionPullRequest } from './session-pull-request';
import { previewLimit } from './workbench-preview';

interface Props {
  changes: readonly SessionPullRequest[];
  // The footer, and a row with no Change of its own to open, open the Inspector's list.
  onOpen: () => void;
  // A row opens its own Change's detail.
  onOpenChange?: (change: SessionPullRequest) => void;
}

// The open Changes the card previews, and the rest, which its footer groups by stage.
interface ChangeSplit {
  preview: SessionPullRequest[];
  rest: SessionPullRequest[];
}

function splitChanges(changes: readonly SessionPullRequest[]): ChangeSplit {
  const preview = changes
    .filter((change) => change.stage === 'open')
    .slice(0, previewLimit);

  const shown = new Set(preview.map(changeKey));

  return {
    preview,
    rest: changes.filter((change) => !shown.has(changeKey(change))),
  };
}

export function WorkbenchChangeRows({
  changes,
  ...opening
}: Props): ReactElement {
  return <View>{previewRows(splitChanges(changes).preview, opening)}</View>;
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
  { onOpen, onOpenChange }: Pick<Props, 'onOpen' | 'onOpenChange'>,
): ReactElement[] =>
  changes.map((change) => (
    <ChangeRow
      key={changeKey(change)}
      change={change}
      onOpen={onOpenChange ? () => onOpenChange(change) : onOpen}
    />
  ));

function MoreChanges(props: Pick<Props, 'changes' | 'onOpen'>): ReactElement {
  return (
    <Pressable
      role="button"
      onPress={props.onOpen}
      className="rounded-control web:hover:bg-hover web:focus-visible:bg-hover"
    >
      <StackedSummary
        icons={remainderIcons(props.changes)}
        texts={remainderTexts(props.changes)}
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

  return [...stageTexts(changes, stages), ...staleText(changes)];
}

function stageTexts(
  changes: readonly SessionPullRequest[],
  stages: readonly SessionPullRequest['stage'][],
): string[] {
  return stages.flatMap((stage) => {
    const count = changes.filter((change) => change.stage === stage).length;

    return count ? [`${count} ${stage === 'open' ? 'more open' : stage}`] : [];
  });
}

// Changes that show what was last known say so in the footer too, since their rows may be out of the preview.
function staleText(changes: readonly SessionPullRequest[]): string[] {
  const stale = changes.filter((change) => change.stale).length;

  return stale ? [`${stale} out of date`] : [];
}
