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
import { createScreenSightRouter } from '../screen-sight';
import { createShellRouter, Sessions } from '../sessions';
import { createSystemRouter } from '../system';
import {
  createVoiceRouter,
  voiceSessions,
  type VoiceSessionWork,
} from '../voice';
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
    screenSight: createScreenSightRouter(deps),
  }),
);

// The Plugins' Session acts run through the Session procedures a client calls; a Plugin's archive adds the uncommitted-files refusal.
function attachSessionActs(deps: AppRouterDeps, sessions: Sessions): void {
  deps.plugins.sessionActs.attach({
    archive: async (sessionId) => {
      await sessions.archiveFromPlugin(sessionId);
    },
    prompt: (sessionId, text, { pluginId, title }) =>
      sessions.promptFromPlugin(
        { sessionId, prompt: [{ type: 'text', text }] },
        { type: 'plugin', pluginId, title },
      ),
    withdraw: (sessionId, queuedId, { pluginId }) =>
      sessions.withdrawFromPlugin(sessionId, queuedId, pluginId),
  });
}

// What the Voice call does through Sessions: send Prompts, stop a Turn, hear Turns end, and ask for a picture of the screen.
const voiceWork = (
  deps: AppRouterDeps,
  sessions: Sessions,
): VoiceSessionWork => ({
  prompt: (sessionId, text) =>
    sessions.promptFromVoice({ sessionId, prompt: [{ type: 'text', text }] }),
  stop: (sessionId) => sessions.stopFromVoice(sessionId),
  capture: (sessionId) =>
    deps.screenSight.capture({ kind: 'voice', sessionId }),
  watchTurns: (sessionId, listener) => sessions.watchTurns(sessionId, listener),
});

// The Voice call sends its Session Prompts through Sessions, which say where each landed and when each Turn ends.
function attachVoice(deps: AppRouterDeps, sessions: Sessions): void {
  const linked = voiceSessions(deps, voiceWork(deps, sessions));

  deps.voice.attach(linked);
}

// Operations share the session and shell nouns with the Session procedures that are not Operations.
const createOperationRouters = routerFactory((deps: AppRouterDeps) => {
  const sessions = new Sessions(deps);

  attachSessionActs(deps, sessions);
  attachVoice(deps, sessions);

  const operations = createOperationProcedures({ ...deps, sessions });

  return router({
    ...operations,
    session: mergeRouters(sessions.router, operations.session),
    shell: mergeRouters(createShellRouter(deps), operations.shell),
    voice: mergeRouters(createVoiceRouter(deps), operations.voice),
  });
});

export const createAppRouter = routerFactory((deps: AppRouterDeps) =>
  mergeRouters(createAppProcedures(deps), createOperationRouters(deps)),
);

export type AppRouter = ReturnType<typeof createAppRouter>;
