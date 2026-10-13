import type {
  AgentApp,
  SetSessionConfigOptionRequest,
  SessionConfigOption,
  CancelNotification,
} from '@agentclientprotocol/sdk';
import { initializeScriptedAgent } from './scripted-initialize.ts';
import { ScriptedMethodPlayer } from './scripted-method-player.ts';
import type { ScriptedNotifications } from './scripted-responses.ts';
import {
  scriptedInitialization,
  type ScriptedScenario,
} from './scripted-scenario.ts';
import { ScriptedSessions } from './scripted-sessions.ts';

export type Script = {
  scenario: ScriptedScenario;
  sessions: ScriptedSessions;
  player: ScriptedMethodPlayer;
  nextId: () => string;
};

const serveInitialization = (
  app: AgentApp,
  { scenario, player }: Pick<Script, 'scenario' | 'player'>,
): AgentApp => {
  const initialize = player.respond('initialize');
  return app.onRequest('initialize', (context) =>
    initializeScriptedAgent(
      context,
      initialize,
      scenario.initialize ?? scriptedInitialization,
    ),
  );
};
const serveNewSession = (
  app: AgentApp,
  { sessions, player, nextId }: Pick<Script, 'sessions' | 'player' | 'nextId'>,
): AgentApp => {
  const newSession = player.respond('session/new');
  return app.onRequest('session/new', (context) => {
    const sessionId = nextId();
    return newSession(context, {
      sessionId,
      configOptions: sessions.open(sessionId),
    });
  });
};
const serveLoad = (
  app: AgentApp,
  { sessions, player }: Pick<Script, 'sessions' | 'player'>,
): AgentApp => {
  const load = player.respond('session/load');
  return app.onRequest('session/load', (context) =>
    load(context, { configOptions: sessions.open(context.params.sessionId) }),
  );
};
const serveResume = (
  app: AgentApp,
  { sessions, player }: Pick<Script, 'sessions' | 'player'>,
): AgentApp => {
  const resume = player.respond('session/resume');
  return app.onRequest('session/resume', (context) =>
    resume(context, { configOptions: sessions.open(context.params.sessionId) }),
  );
};
const serveClose = (
  app: AgentApp,
  { sessions, player }: Pick<Script, 'sessions' | 'player'>,
): AgentApp => {
  const close = player.respond('session/close');
  return app.onRequest('session/close', (context) => {
    sessions.close(context.params.sessionId);
    return close(context, {});
  });
};
const serveConfiguration = (
  app: AgentApp,
  script: Pick<Script, 'scenario' | 'sessions' | 'player'>,
): AgentApp => {
  const configure = script.player.respond('session/set_config_option');
  return app.onRequest('session/set_config_option', (context) =>
    configure(context, {
      configOptions: configurationResponse(script, context.params),
    }),
  );
};
const configurationResponse = (
  { scenario, sessions }: Pick<Script, 'scenario' | 'sessions'>,
  params: SetSessionConfigOptionRequest,
): SessionConfigOption[] =>
  scenario.responses?.['session/set_config_option']
    ? []
    : sessions.configure(params);

const serveCancellation = (
  app: AgentApp,
  { scenario, sessions }: Pick<Script, 'scenario' | 'sessions'>,
): AgentApp =>
  app.onNotification('session/cancel', ({ params }) => {
    const notification = scenario.notifications?.['session/cancel'];
    observeCancellation(notification, params);
    sessions.cancel(params.sessionId);
  });

const serveOtherMethods = (
  app: AgentApp,
  { player }: Pick<Script, 'player'>,
): AgentApp => {
  const authenticate = player.respond('authenticate');
  const mode = player.respond('session/set_mode');
  return app
    .onRequest('authenticate', (context) => authenticate(context, {}))
    .onRequest('session/set_mode', (context) => mode(context, {}));
};

const observeCancellation = (
  notification: ScriptedNotifications['session/cancel'],
  params: CancelNotification,
): void => {
  if (!notification) return;
  notification.requests?.push(params);
  receiveCancellation(notification, params);
};
const receiveCancellation = (
  notification: Pick<
    NonNullable<ScriptedNotifications['session/cancel']>,
    'received'
  >,
  params: CancelNotification,
): void => {
  notification.received?.resolve(params);
};
const registrations = [
  serveInitialization,
  serveNewSession,
  serveLoad,
  serveResume,
  serveClose,
  serveConfiguration,
  serveCancellation,
  serveOtherMethods,
];
export const serveScript = (app: AgentApp, script: Script): AgentApp =>
  registrations
    .reduce((registered, register) => register(registered, script), app)
    .onRequest('session/prompt', (context) =>
      script.player.dispatchPrompt(context),
    );
