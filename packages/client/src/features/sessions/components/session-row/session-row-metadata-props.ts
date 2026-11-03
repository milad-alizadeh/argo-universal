import type { SessionInfo } from '@repo/contracts';
import type { ChangeStageProps } from '../change-stage/change-stage';

export interface SessionRowMetadataProps {
  session: SessionInfo;
  selected: boolean;
  pullRequest?: ChangeStageProps;
  age?: string;
}
