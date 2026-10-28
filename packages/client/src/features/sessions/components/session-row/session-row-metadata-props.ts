import type { SessionInfo } from '@repo/contracts';
import type { ChangeStageProps } from '../change-stage/change-stage';
import type { OpenPluginPage, SessionRowPlugins } from './session-row-props';

export interface SessionRowMetadataProps {
  session: SessionInfo;
  selected: boolean;
  subagentsFailed?: boolean;
  pullRequest?: ChangeStageProps;
  age?: string;
  // The Plugins' items, after Argo's own, in the Plugins' order.
  plugins?: SessionRowPlugins;
  onOpenPluginPage?: OpenPluginPage;
}
