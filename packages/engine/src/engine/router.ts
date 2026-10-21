import { createAgentsRouter } from '../agents';
import { createBlobRouter } from '../blob';
import { uploadBlob } from '../blob/blob';
import { createFeedRouter } from '../feed';
import { readGitHub } from '../link-preview/github-access';
import { readPreviewUrl } from '../link-preview/read-url';
import { createLinkPreviewRouter } from '../link-preview/router';
import { createNotificationsRouter } from '../notifications';
import { createPluginsRouter } from '../plugins';
import { createProjectsRouter } from '../projects';
import { router, routerFactory } from '../rpc';
import { createSessionRouter, createShellRouter } from '../sessions';
import { createSystemRouter } from '../system';
import type { AppRouterDeps } from './router-deps';

// Each router takes only the slice of the Engine's dependencies its type names.
export const createAppRouter = routerFactory((deps: AppRouterDeps) =>
  router({
    blob: createBlobRouter(deps),
    linkPreview: createLinkPreviewRouter({
      read: readPreviewUrl,
      github: readGitHub,
      storeImage: (image) => uploadBlob(deps, image),
    }),
    plugins: createPluginsRouter(deps),
    agents: createAgentsRouter(deps),
    projects: createProjectsRouter(deps),
    system: createSystemRouter(deps),
    feed: createFeedRouter(deps),
    notifications: createNotificationsRouter(deps),
    session: createSessionRouter(deps),
    shell: createShellRouter(deps),
  }),
);

export type AppRouter = ReturnType<typeof createAppRouter>;
