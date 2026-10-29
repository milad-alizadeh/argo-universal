import type { ChangesSummary } from '@repo/contracts';
import type { ChangeState } from './change-stage/change-stage-model';
import type { PullRequestChecksProps } from './pull-request-checks';

// One of a Session's Changes, shown by its Workbench and Inspector.
export type SessionPullRequest = ChangeState & {
  number: number;
  title: string;
  checks?: PullRequestChecksProps;
  summary?: ChangesSummary;
  mergeable: boolean;
};
