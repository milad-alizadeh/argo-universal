import type { SessionInfo } from '@repo/contracts';
import type { PullRequestIndicatorProps } from '../pull-request-indicator/pull-request-indicator';

export interface SessionRowMetadataProps {
  session: SessionInfo;
  selected: boolean;
  subagentsFailed?: boolean;
  pullRequest?: PullRequestIndicatorProps;
  age?: string;
}
