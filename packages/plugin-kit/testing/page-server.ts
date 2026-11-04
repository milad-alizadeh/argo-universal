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

/*
 * The App a test asks as: its platform, and whether it runs on the Server Device, where a Plugin may sign
 * in, rather than on a paired device.
 */
export type TestApp = { platform: Platform; serverDevice?: boolean };

/*
 * Where a test opens a Loader page: its Page path, the Project and Session it opens for, its first Page
 * state, and the App it opens in.
 */
export type PageOpening = {
  path: string;
  projectId?: string;
  sessionId?: string;
  pageState?: PageState;
  platform?: Platform;
  serverDevice?: boolean;
};

// What an open page asks of the Server, as its App asks: a draw of its address, and an Operation run.
export type PageServer = {
  draw: (
    request: Omit<DrawRequest, 'pluginId'>,
    app: TestApp,
  ) => Promise<DrawAnswer>;
  run: (run: Omit<PageRun, 'pluginId'>, app: TestApp) => Promise<PageRunAnswer>;
};

export type Opened = PageOpening & TestApp;

// The Project and Session an open page's draws and runs are for, named only when the page has them.
export const caller = ({
  projectId,
  sessionId,
}: PageOpening): Pick<PageRun, 'projectId' | 'sessionId'> => ({
  ...(projectId && { projectId }),
  ...(sessionId && { sessionId }),
});
