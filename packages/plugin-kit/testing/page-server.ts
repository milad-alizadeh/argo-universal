import type { PluginSurface } from '@repo/contracts/plugins/kit';
import type {
  PageRun,
  PageRunAnswer,
  PageState,
} from '@repo/contracts/plugins/page-address';
import type {
  DrawAnswer,
  DrawRequest,
} from '@repo/contracts/plugins/page-draw';

type Platform = PluginSurface['platform'];

// Where a test opens a Loader page: its Page path, the Project and Session it opens for, its first Page state, and the App's platform.
export type PageOpening = {
  path: string;
  projectId?: string;
  sessionId?: string;
  pageState?: PageState;
  platform?: Platform;
};

// What a page view asks of the Server: a draw of its address, as the platform's App asks, and an Operation run.
export type PageServer = {
  draw: (
    request: Omit<DrawRequest, 'pluginId'>,
    platform: Platform,
  ) => Promise<DrawAnswer>;
  run: (run: Omit<PageRun, 'pluginId'>) => Promise<PageRunAnswer>;
};

export type Opened = PageOpening & { platform: Platform };

// The Project and Session a view's draws and runs are for, named only when the view has them.
export const caller = ({
  projectId,
  sessionId,
}: PageOpening): Pick<PageRun, 'projectId' | 'sessionId'> => ({
  ...(projectId && { projectId }),
  ...(sessionId && { sessionId }),
});
