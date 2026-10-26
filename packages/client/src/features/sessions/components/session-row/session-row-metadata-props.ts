import type { SessionInfo } from '@repo/contracts';
import type { SessionRowItem } from '@repo/contracts/plugins/wire';
import type { ChangeStageProps } from '../change-stage/change-stage';

export interface SessionRowMetadataProps {
  session: SessionInfo;
  selected: boolean;
  subagentsFailed?: boolean;
  pullRequest?: ChangeStageProps;
  age?: string;
  // The Plugins' items, after Argo's own, in the Plugins' order.
  items?: readonly SessionRowItem[];
}
