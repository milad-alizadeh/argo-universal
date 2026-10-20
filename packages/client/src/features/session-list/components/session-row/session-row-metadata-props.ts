import type { SessionInfo } from '@repo/contracts';
import type { PullRequestIndicatorProps } from '#features/sessions';

export interface SessionRowMetadataProps {
  session: SessionInfo;
  selected: boolean;
  subagentsFailed?: boolean;
  pullRequest?: PullRequestIndicatorProps;
  age?: string;
}
