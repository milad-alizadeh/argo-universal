import type { RegistryDeps } from '../agents';
import type { AppNavigation } from '../app-navigation';
import type { FeedDeps } from '../feed';
import type { PluginsRouterDeps } from '../plugins';
import type { ScreenSight } from '../screen-sight';
import type { Sessions } from '../sessions';
import type { VoiceCallsPort } from '../voice';
import type { SessionTokens } from './session-tokens';
import type { OperationWaitClock } from './work';

export type OperationsDeps = RegistryDeps &
  Pick<FeedDeps, 'findWriter'> & {
    sessions: Sessions;
    voice: VoiceCallsPort;
    appNavigation: AppNavigation;
    screenSight: ScreenSight;
    controlToken: string;
    userHome: string;
    sessionTokens: SessionTokens;
    blobsFolder: string;
    plugins: PluginsRouterDeps;
    operationWaitClock?: OperationWaitClock;
    sessionCommandSignal?: AbortSignal;
    createId: () => string;
  };
