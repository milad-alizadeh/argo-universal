import type { RegistryDeps } from '../agents';
import type { AppNavigation } from '../app-navigation';
import type { ChartPreview } from '../chart-preview';
import type { ConversationsPort } from '../conversation';
import type { FeedDeps } from '../feed';
import type { PluginsRouterDeps } from '../plugins';
import type { Runs } from '../runs';
import type { ScreenSight } from '../screen-sight';
import type { Sessions } from '../sessions';
import type { SessionTokens } from './session-tokens';
import type { OperationWaitClock } from './work';

export type OperationsDeps = RegistryDeps &
  Pick<FeedDeps, 'findWriter'> & {
    sessions: Sessions;
    runs: Runs;
    conversation: ConversationsPort;
    appNavigation: AppNavigation;
    screenSight: ScreenSight;
    chartPreview: ChartPreview;
    controlToken: string;
    userHome: string;
    sessionTokens: SessionTokens;
    blobsFolder: string;
    plugins: PluginsRouterDeps;
    operationWaitClock?: OperationWaitClock;
    sessionCommandSignal?: AbortSignal;
    createId: () => string;
  };
