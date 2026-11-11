import { Button, EmptyState, type PageTo } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import {
  noIssuesBecause,
  type FilterData,
  type FilterState,
} from './filter-loader';

/*
 * What an empty list says: why there are no Issues. Where the Tracker did not open, Project details is where it
 * is set up, so the state offers to ask again once it is.
 */
export const noIssues = (
  data: FilterData,
  to: PageTo<FilterState>,
): JSX.Element => (
  <EmptyState
    title={noIssuesBecause(data) || 'No Issues.'}
    action={data.state === 'unopened' ? checkAgain(to) : undefined}
  />
);

const checkAgain = (to: PageTo<FilterState>): JSX.Element => (
  <Button label="Check again" onPress={to.set({})} />
);
