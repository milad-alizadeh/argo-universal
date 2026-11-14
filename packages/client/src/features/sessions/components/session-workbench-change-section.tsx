import type { ChangesSummary } from '@repo/contracts';
import { Text } from '@repo/kit/primitives/content/text';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { checkoutTotals } from './change-composition';
import { ChangeDiffTotal } from './change-diff-total';
import type { SessionPullRequest } from './session-pull-request';
import { WorkbenchChangeRows } from './session-workbench-changes';

interface Props {
  pullRequests?: readonly SessionPullRequest[];
  summary?: ChangesSummary;
  onOpen: () => void;
  // A Change's row opens that Change; without it every row opens the list.
  onOpenChange?: (change: SessionPullRequest) => void;
}

// The Changes card's body: the open Changes as rows, or, with no pull request, the diff total.
export function WorkbenchChangesSummary({
  pullRequests = [],
  summary,
  ...opening
}: Props): ReactElement {
  if (pullRequests.length)
    return (
      <View className="gap-2">
        <WorkbenchChangeRows changes={pullRequests} {...opening} />
        <CheckoutOwn summary={checkoutTotals(pullRequests, summary)} />
      </View>
    );

  return <DiffTotal summary={summary} />;
}

// Provisional: work in the Checkout that no pull request holds, said apart so it is never read as a pull request's totals.
function CheckoutOwn({ summary }: Pick<Props, 'summary'>): ReactElement | null {
  if (!summary) return null;

  return (
    <View className="gap-0.5 px-1">
      <Text role="secondary" tone="muted">
        Not in a pull request
      </Text>
      <ChangeDiffTotal {...summary} />
    </View>
  );
}

function DiffTotal({ summary }: Pick<Props, 'summary'>): ReactElement {
  return (
    <View className="gap-2 px-1">
      {summary && <ChangeDiffTotal {...summary} />}
    </View>
  );
}
