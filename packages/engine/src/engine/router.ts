import { createAgentsRouter } from '../agents';
import { createAppNavigationRouter } from '../app-navigation';
import { createBlobRouter } from '../blob';
import { createDevicesRouter } from '../devices';
import { createFeedRouter } from '../feed';
import { createServerLinkPreviewRouter } from '../link-preview';
import { createNetworkRouter } from '../network-access';
import { createNotificationsRouter } from '../notifications';
import { createOperationProcedures } from '../operations';
import { createPairingRouter } from '../pairing/router';
import { createPluginsRouter } from '../plugins';
import { mergeRouters, router, routerFactory } from '../rpc';
import { createShellRouter, Sessions } from '../sessions';
import { createSystemRouter } from '../system';
import type { AppRouterDeps } from './router-deps';

// Each router takes only the slice of the Engine's dependencies its type names.
const createAppProcedures = routerFactory((deps: AppRouterDeps) =>
  router({
    blob: createBlobRouter(deps),
    linkPreview: createServerLinkPreviewRouter(deps),
    plugins: createPluginsRouter(deps.plugins),
    agents: createAgentsRouter(deps),
    system: createSystemRouter(deps),
    devices: createDevicesRouter(deps),
    feed: createFeedRouter(deps),
    notifications: createNotificationsRouter(deps),
    network: createNetworkRouter(deps),
    pairing: createPairingRouter(deps),
    navigation: createAppNavigationRouter(deps),
  }),
);

// The Plugins' Session acts run through the Session procedures a client calls; a Plugin's archive adds the uncommitted-files refusal.
function attachSessionActs(deps: AppRouterDeps, sessions: Sessions): void {
  deps.plugins.sessionActs.attach({
    archive: async (sessionId) => {
      await sessions.archiveFromPlugin(sessionId);
    },
    prompt: async (sessionId, text, { pluginId, title }) => ({
      status: await sessions.promptFromPlugin(
        { sessionId, prompt: [{ type: 'text', text }] },
        { type: 'plugin', pluginId, title },
      ),
    }),
  });
}

// Operations share the session and shell nouns with the Session procedures that are not Operations.
const createOperationRouters = routerFactory((deps: AppRouterDeps) => {
  const sessions = new Sessions(deps);

  attachSessionActs(deps, sessions);

  const operations = createOperationProcedures({ ...deps, sessions });

  return router({
    ...operations,
    session: mergeRouters(sessions.router, operations.session),
    shell: mergeRouters(createShellRouter(deps), operations.shell),
  });
});

export const createAppRouter = routerFactory((deps: AppRouterDeps) =>
  mergeRouters(createAppProcedures(deps), createOperationRouters(deps)),
);

export type AppRouter = ReturnType<typeof createAppRouter>;
