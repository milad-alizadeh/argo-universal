import type { ChangesSummary } from '@repo/contracts';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { ChangeDiffTotal } from './change-diff-total';
import type { SessionPullRequest } from './session-pull-request';
import { WorkbenchChangeRows } from './session-workbench-changes';

interface Props {
  pullRequests?: readonly SessionPullRequest[];
  summary?: ChangesSummary;
  onOpen: () => void;
}

// The Changes card's body: the open Changes as rows, or, with no pull request, the diff total.
export function WorkbenchChangesSummary({
  pullRequests = [],
  summary,
  onOpen,
}: Props): ReactElement {
  if (pullRequests.length)
    return <WorkbenchChangeRows changes={pullRequests} onOpen={onOpen} />;

  return <DiffTotal summary={summary} />;
}

function DiffTotal({ summary }: Pick<Props, 'summary'>): ReactElement {
  return (
    <View className="gap-2 px-1">
      {summary && <ChangeDiffTotal {...summary} />}
    </View>
  );
}
