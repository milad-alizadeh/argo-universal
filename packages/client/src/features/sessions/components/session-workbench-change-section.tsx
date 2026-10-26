import type { ReactElement } from 'react';
import { View } from 'react-native';
import { ChangeDiffTotal } from './change-diff-total';
import { PullRequestChecks } from './pull-request-checks';
import type { SessionHeaderPanels } from './session-header-props';
import {
  WorkbenchChangeRows,
  WorkbenchMoreChanges,
} from './session-workbench-changes';

type Props = { panels: SessionHeaderPanels; onOpen: () => void };

const openPreview = (
  panels: SessionHeaderPanels,
  fallback: () => void,
): (() => void) => panels.onOpenChanges ?? fallback;

// The Changes card's body: the open Changes as rows, or, with no pull request, the diff total and checks.
export function WorkbenchChangesSection({
  panels,
  onOpen,
}: Props): ReactElement {
  if (panels.pullRequests?.length)
    return (
      <WorkbenchChangeRows
        changes={panels.pullRequests}
        onOpen={openPreview(panels, onOpen)}
      />
    );

  return <FallbackSummary panels={panels} />;
}

// What the Changes card groups under its rows: the Changes the preview leaves out.
export function WorkbenchChangesFooter({
  panels,
  onOpen,
}: Props): ReactElement | null {
  if (!panels.pullRequests?.length) return null;

  return (
    <WorkbenchMoreChanges
      changes={panels.pullRequests}
      onOpen={openPreview(panels, onOpen)}
    />
  );
}

function FallbackSummary({ panels }: Pick<Props, 'panels'>): ReactElement {
  return (
    <View className="gap-2 px-1">
      {panels.changesSummary && <ChangeDiffTotal {...panels.changesSummary} />}
      {panels.checks && <PullRequestChecks {...panels.checks} />}
    </View>
  );
}
