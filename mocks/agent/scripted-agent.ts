import {
  agent,
  ndJsonStream,
  type AgentApp,
  type AgentConnection,
} from '@agentclientprotocol/sdk';
import {
  runTurn,
  scriptedInitialization,
  type ScriptedScenario,
} from './scripted-scenario.ts';
import { ScriptedSessions } from './scripted-sessions.ts';

// Node runs the stdio entry without a build, so this file imports only the SDK and its siblings.

type Wire = {
  writeRaw: (frame: string) => Promise<void>;
  closed: Promise<void>;
};
type Script = {
  scenario: ScriptedScenario;
  sessions: ScriptedSessions;
  wire: Wire;
};

// Raw frames share the SDK's writer, so they keep their place between SDK messages.
const shareOutput = (
  output: WritableStream<Uint8Array>,
): { stream: WritableStream<Uint8Array>; writeRaw: Wire['writeRaw'] } => {
  const writer = output.getWriter();
  const encoder = new TextEncoder();
  return {
    stream: new WritableStream({
      write: (chunk) => writer.write(chunk),
      close: () => writer.close(),
      abort: (reason: unknown) => writer.abort(reason),
    }),
    writeRaw: (frame) => writer.write(encoder.encode(`${frame}\n`)),
  };
};

const serveOpenings = (
  app: AgentApp,
  { scenario, sessions }: Script,
): AgentApp =>
  app
    .onRequest(
      'initialize',
      () => scenario.initialize ?? scriptedInitialization,
    )
    .onRequest('session/new', () => {
      const sessionId = `${process.pid}:${crypto.randomUUID()}`;
      return { sessionId, configOptions: sessions.open(sessionId) };
    })
    .onRequest('session/load', ({ params }) => ({
      configOptions: sessions.open(params.sessionId),
    }))
    .onRequest('session/resume', ({ params }) => ({
      configOptions: sessions.open(params.sessionId),
    }));

const serveCommands = (app: AgentApp, { sessions }: Script): AgentApp =>
  app
    .onRequest('session/close', ({ params }) => {
      sessions.close(params.sessionId);
      return {};
    })
    .onRequest('session/set_config_option', ({ params }) => ({
      configOptions: sessions.configure(params),
    }))
    .onNotification('session/cancel', ({ params }) => {
      sessions.cancel(params.sessionId);
    });

const servePrompts = (
  app: AgentApp,
  { scenario, sessions, wire }: Script,
): AgentApp =>
  app.onRequest('session/prompt', async ({ params, client }) => {
    const { sessionId } = params;
    const cancellation = sessions.startTurn(sessionId);
    try {
      return await runTurn(scenario.steps, {
        sessionId,
        client,
        ...cancellation,
        ...wire,
      });
    } finally {
      sessions.endTurn(sessionId);
    }
  });

// Plays the scenario's steps on every prompt; the SDK's `agent()` does the protocol.
export const createScriptedAgent = (
  scenario: ScriptedScenario,
): {
  connect: (
    output: WritableStream<Uint8Array>,
    input: ReadableStream<Uint8Array>,
  ) => AgentConnection;
} => ({
  connect: (output, input) => {
    const shared = shareOutput(output);
    const closed = Promise.withResolvers<void>();
    const script: Script = {
      scenario,
      sessions: new ScriptedSessions(scenario.configOptions ?? []),
      wire: { writeRaw: shared.writeRaw, closed: closed.promise },
    };
    const app = serveCommands(serveOpenings(agent(), script), script);
    const connection = servePrompts(app, script).connect(
      ndJsonStream(shared.stream, input),
    );
    void connection.closed.then(() => closed.resolve());
    return connection;
  },
});
