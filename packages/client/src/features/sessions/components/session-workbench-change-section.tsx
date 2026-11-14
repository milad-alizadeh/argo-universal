import type { ChangesSummary } from '@repo/contracts';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { ChangeDiffTotal } from './change-diff-total';
import type { SessionPullRequest } from './session-pull-request';
import { WorkbenchChangeRows } from './session-workbench-changes';

interface Props {
  pullRequests?: readonly SessionPullRequest[];
  summary?: ChangesSummary;
  // A pull request's row opens that pull request on its code host.
  onOpenChange: (change: SessionPullRequest) => void;
}

// The Changes card's body: the pull requests as rows, or, with none, the Checkout's diff total.
export function WorkbenchChangesSummary({
  pullRequests = [],
  summary,
  onOpenChange,
}: Props): ReactElement {
  if (pullRequests.length)
    return (
      <WorkbenchChangeRows changes={pullRequests} onOpenChange={onOpenChange} />
    );

  return <DiffTotal summary={summary} />;
}

function DiffTotal({ summary }: Pick<Props, 'summary'>): ReactElement {
  return (
    <View className="gap-2 px-1">
      {summary && <ChangeDiffTotal {...summary} />}
    </View>
  );
}
