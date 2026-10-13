import {
  agent,
  ndJsonStream,
  type AgentConnection,
} from '@agentclientprotocol/sdk';
import { serveScript, type Script } from './scripted-handlers.ts';
import {
  ScriptedMethodPlayer,
  type ScriptedWire,
} from './scripted-method-player.ts';
import { shareScriptedOutput } from './scripted-output.ts';
import {
  runTurn,
  type ScriptedScenario,
  type ScriptedStep,
} from './scripted-scenario.ts';
import { ScriptedSessions } from './scripted-sessions.ts';

type ConnectedScript = { connection: AgentConnection; wire: ScriptedWire };

class ScriptedAgent {
  private readonly scenario: ScriptedScenario;
  private readonly nextSessionId: () => string;
  private connected: ConnectedScript | undefined;
  private opened = 0;
  public constructor(scenario: ScriptedScenario, nextSessionId: () => string) {
    this.scenario = scenario;
    this.nextSessionId = nextSessionId;
  }
  private nextId(): string {
    return this.scenario.sessionIds?.[this.opened++] ?? this.nextSessionId();
  }
  private createScript(wire: ScriptedWire): Script {
    const sessions = new ScriptedSessions(this.scenario.configOptions ?? []);

    return {
      scenario: this.scenario,
      sessions,
      player: new ScriptedMethodPlayer({
        scenario: this.scenario,
        sessions,
        wire,
      }),
      nextId: () => this.nextId(),
    };
  }
  public connect(
    output: WritableStream<Uint8Array>,
    input: ReadableStream<Uint8Array>,
  ): AgentConnection {
    const shared = shareScriptedOutput(output);
    const closed = Promise.withResolvers<void>();
    const wire = { writeRaw: shared.writeRaw, closed: closed.promise };

    const connection = serveScript(agent(), this.createScript(wire)).connect(
      ndJsonStream(shared.stream, input),
    );

    void connection.closed.then(() => closed.resolve());
    this.connected = { connection, wire };

    return connection;
  }
  private requireConnection(): ConnectedScript {
    if (!this.connected) throw new Error('Scripted Agent is not connected');

    return this.connected;
  }
  public async play(
    steps: readonly ScriptedStep[],
    sessionId: string,
  ): Promise<void> {
    const connected = this.requireConnection();
    await runTurn(steps, {
      sessionId,
      client: connected.connection.client,
      cancelled: new Promise(() => {}),
      isCancelled: () => false,
      ...connected.wire,
    });
  }
  public sendRaw(frame: string): Promise<void> {
    return this.requireConnection().wire.writeRaw(frame);
  }
}

export const createScriptedAgent = (
  scenario: ScriptedScenario,
  nextSessionId = (): string => `${process.pid}:${crypto.randomUUID()}`,
): Pick<ScriptedAgent, 'connect' | 'play' | 'sendRaw'> => {
  const scripted = new ScriptedAgent(scenario, nextSessionId);

  return {
    connect: (output, input) => scripted.connect(output, input),
    play: (steps, sessionId) => scripted.play(steps, sessionId),
    sendRaw: (frame) => scripted.sendRaw(frame),
  };
};
