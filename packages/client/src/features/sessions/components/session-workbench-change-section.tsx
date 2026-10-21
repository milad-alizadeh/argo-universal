import type { ReactElement } from 'react';
import { View } from 'react-native';
import { ChangeDiffTotal } from './change-diff-total';
import { PullRequestChecks } from './pull-request-checks';
import type { SessionHeaderPanels } from './session-header-props';
import { WorkbenchChanges } from './session-workbench-changes';

type Props = { panels: SessionHeaderPanels; onOpen: () => void };

export function WorkbenchChangesSection({
  panels,
  onOpen,
}: Props): ReactElement {
  if (panels.pullRequests?.length)
    return (
      <WorkbenchChanges
        changes={panels.pullRequests}
        onOpen={openPreview(panels, onOpen)}
      />
    );

  return <FallbackSummary panels={panels} />;
}

function FallbackSummary({ panels }: Pick<Props, 'panels'>): ReactElement {
  return (
    <View className="gap-2 px-4 pb-3">
      {panels.changesSummary && <ChangeDiffTotal {...panels.changesSummary} />}
      {panels.checks && <PullRequestChecks {...panels.checks} />}
    </View>
  );
}

export function WorkbenchChangesTotal({
  panels,
}: Pick<Props, 'panels'>): ReactElement | null {
  if (!panels.pullRequests?.length) return null;

  return <HeaderTotal summary={panels.changesSummary} />;
}

function HeaderTotal({
  summary,
}: {
  summary: SessionHeaderPanels['changesSummary'];
}): ReactElement | null {
  return summary ? <ChangeDiffTotal {...summary} /> : null;
}

const openPreview = (
  panels: SessionHeaderPanels,
  fallback: () => void,
): (() => void) => panels.onOpenChanges ?? fallback;
