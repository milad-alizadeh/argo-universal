import {
  agent,
  ndJsonStream,
  type AgentApp,
  type AgentConnection,
} from '@agentclientprotocol/sdk';
import {
  ScriptedMethodPlayer,
  type ScriptedWire,
} from './scripted-method-player.ts';
import { shareScriptedOutput } from './scripted-output.ts';
import {
  runTurn,
  scriptedInitialization,
  type ScriptedScenario,
  type ScriptedStep,
} from './scripted-scenario.ts';
import { ScriptedSessions } from './scripted-sessions.ts';

type Script = {
  scenario: ScriptedScenario;
  sessions: ScriptedSessions;
  player: ScriptedMethodPlayer;
  nextId: () => string;
};

const serveOpenings = (
  app: AgentApp,
  { scenario, sessions, player, nextId }: Script,
): AgentApp => {
  const initialize = player.respond('initialize');
  const newSession = player.respond('session/new');
  const load = player.respond('session/load');
  const resume = player.respond('session/resume');
  return app
    .onRequest('initialize', (context) =>
      initialize(context, scenario.initialize ?? scriptedInitialization),
    )
    .onRequest('session/new', (context) => {
      const sessionId = nextId();
      return newSession(context, {
        sessionId,
        configOptions: sessions.open(sessionId),
      });
    })
    .onRequest('session/load', (context) =>
      load(context, { configOptions: sessions.open(context.params.sessionId) }),
    )
    .onRequest('session/resume', (context) =>
      resume(context, {
        configOptions: sessions.open(context.params.sessionId),
      }),
    );
};

const serveCommands = (
  app: AgentApp,
  { scenario, sessions, player }: Script,
): AgentApp => {
  const close = player.respond('session/close');
  const configure = player.respond('session/set_config_option');
  return app
    .onRequest('session/close', (context) => {
      sessions.close(context.params.sessionId);
      return close(context, {});
    })
    .onRequest('session/set_config_option', (context) =>
      configure(context, {
        configOptions: scenario.responses?.['session/set_config_option']
          ? []
          : sessions.configure(context.params),
      }),
    )
    .onNotification('session/cancel', ({ params }) => {
      scenario.notifications?.['session/cancel']?.requests?.push(params);
      scenario.notifications?.['session/cancel']?.received?.resolve(params);
      sessions.cancel(params.sessionId);
    });
};

const serveOtherMethods = (app: AgentApp, { player }: Script): AgentApp => {
  const authenticate = player.respond('authenticate');
  const mode = player.respond('session/set_mode');
  return app
    .onRequest('authenticate', (context) => authenticate(context, {}))
    .onRequest('session/set_mode', (context) => mode(context, {}));
};

export const createScriptedAgent = (
  scenario: ScriptedScenario,
  nextSessionId = (): string => `${process.pid}:${crypto.randomUUID()}`,
): {
  connect: (
    output: WritableStream<Uint8Array>,
    input: ReadableStream<Uint8Array>,
  ) => AgentConnection;
  play: (steps: readonly ScriptedStep[], sessionId: string) => Promise<void>;
  sendRaw: (frame: string) => Promise<void>;
} => {
  let connected:
    | { connection: AgentConnection; wire: ScriptedWire }
    | undefined;
  let opened = 0;
  return {
    connect: (output, input) => {
      const shared = shareScriptedOutput(output);
      const closed = Promise.withResolvers<void>();
      const wire = { writeRaw: shared.writeRaw, closed: closed.promise };
      const sessions = new ScriptedSessions(scenario.configOptions ?? []);
      const script = {
        scenario,
        sessions,
        player: new ScriptedMethodPlayer({ scenario, sessions, wire }),
        nextId: (): string =>
          scenario.sessionIds?.[opened++] ?? nextSessionId(),
      };
      const app = serveOtherMethods(
        serveCommands(serveOpenings(agent(), script), script),
        script,
      );
      const connection = app
        .onRequest('session/prompt', (context) =>
          script.player.dispatchPrompt(context),
        )
        .connect(ndJsonStream(shared.stream, input));
      void connection.closed.then(() => closed.resolve());
      connected = { connection, wire };
      return connection;
    },
    play: async (steps, sessionId) => {
      if (!connected) throw new Error('Scripted Agent is not connected');
      await runTurn(steps, {
        sessionId,
        client: connected.connection.client,
        cancelled: new Promise(() => {}),
        isCancelled: () => false,
        ...connected.wire,
      });
    },
    sendRaw: (frame) => {
      if (!connected) throw new Error('Scripted Agent is not connected');
      return connected.wire.writeRaw(frame);
    },
  };
};
