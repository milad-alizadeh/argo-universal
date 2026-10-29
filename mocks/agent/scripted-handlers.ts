import type {
  AgentApp,
  SetSessionConfigOptionRequest,
  SessionConfigOption,
  CancelNotification,
  NewSessionResponse,
} from '@agentclientprotocol/sdk';
import {
  serveOtherMethods,
  requireScriptedAuthentication,
} from './scripted-auth.ts';
import { ScriptedMethodPlayer } from './scripted-method-player.ts';
import type { ScriptedNotifications } from './scripted-responses.ts';
import {
  runAfterResponse,
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
    initialize(context, scenario.initialize ?? scriptedInitialization),
  );
};

// A new Session's Slash commands come after its response, as an Agent sends them.
const afterOpening = (
  { scenario, player }: Pick<Script, 'scenario' | 'player'>,
  context: Parameters<ScriptedMethodPlayer['turn']>[0],
  response: NewSessionResponse,
): NewSessionResponse => {
  if (scenario.afterOpening)
    runAfterResponse(
      scenario.afterOpening,
      player.turn(context, response.sessionId, false),
    );

  return response;
};

const serveNewSession = (
  app: AgentApp,
  script: Pick<Script, 'sessions' | 'player' | 'nextId' | 'scenario'>,
): AgentApp => {
  const { sessions, player, nextId, scenario } = script;
  const respond = player.respond('session/new');

  return app.onRequest('session/new', async (context) => {
    requireScriptedAuthentication(scenario);
    const sessionId = nextId();
    const configOptions = sessions.open(sessionId);
    const response = await respond(context, { sessionId, configOptions });

    return afterOpening(script, context, response);
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
    resume(context, {
      configOptions: sessions.resume(context.params.sessionId),
    }),
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
