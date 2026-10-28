import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { AnyMessage, SessionNotification } from '@agentclientprotocol/sdk';
import type { ShellRecord } from '@repo/contracts';
import { onTestFinished } from 'vitest';
import { createActor } from 'xstate';
import { createAgentClient } from '../src/agents';
import {
  createShells,
  type SessionData,
  type ShellCommand,
  type ShellCommandInput,
  type ShellLauncher,
  type Shells,
} from '../src/sessions';
import { writerMachine, type WriterActorRef } from '../src/storage';
import { resourceLaunch } from './acp-resource';
import { openTestDatabase } from './database';
import { createScriptedAgentWire } from './scripted-agent';

type Exit = { exitCode: number | null; signal?: string };

type MemoryShellCommand = ShellCommand & {
  input: ShellCommandInput;
  // Output the command prints, delivered to the Shell as a process would.
  print: (text: string) => Promise<void>;
  exit: (exitCode: number) => void;
};

// The in-memory adapter for how a Shell's command starts: nothing runs, and the test says what each command prints and when it exits.
const memoryLauncher =
  (commands: MemoryShellCommand[]): ShellLauncher =>
  (input) => {
    const exited = Promise.withResolvers<Exit>();
    let running = true;

    const end = (status: Exit): void => {
      running = false;
      exited.resolve(status);
    };

    const command: MemoryShellCommand = {
      input,
      exited: exited.promise,
      isRunning: (): boolean => running,
      kill: (): boolean => {
        const wasRunning = running;

        if (wasRunning) end({ exitCode: null, signal: 'SIGKILL' });

        return wasRunning;
      },
      print: (text): Promise<void> =>
        Promise.resolve(input.output(Buffer.from(text))),
      exit: (exitCode): void => end({ exitCode }),
    };

    commands.push(command);

    return Promise.resolve(command);
  };

const session: SessionData = {
  sessionId: 'session-1',
  projectId: 'project-1',
  agent: 'mock',
  vendorSessionId: null,
  checkout: { path: '/project', branch: null },
  configValues: [],
  heldConfig: [],
  epoch: 0,
  maxRevision: 0,
  activityAt: 0,
  nextPosition: 0,
  kept: false,
  undisclosedInterruptedTurnId: null,
};

type Database = ReturnType<typeof openTestDatabase>['database'];

const startWriter = (database: Database, directory: string): WriterActorRef => {
  const blobsFolder = join(directory, 'blobs');
  mkdirSync(blobsFolder);

  const writer = createActor(writerMachine, {
    input: { database, now: Date.now, blobsFolder },
  }).start();

  onTestFinished(() => {
    writer.stop();
  });

  return writer;
};

type Destination = ReturnType<Shells['attach']>;

// The Agent's side of ACP: sends terminal requests down a wire and reads the response.
type TerminalCall = (
  method: string,
  params: Record<string, string>,
) => Promise<AnyMessage>;

const agentSide = (destination: Destination): TerminalCall => {
  const wire = createScriptedAgentWire({ steps: [] });

  const connection = createAgentClient({
    stream: wire.stream,
    terminalRequests: destination.terminalRequests,
    acceptSessionUpdate: () => {},
    requestPermission: () => ({ outcome: { outcome: 'cancelled' } }),
    createElicitation: () => ({ action: 'cancel' }),
  });

  onTestFinished(async () => {
    connection.close();
    await connection.closed;
  });
  let requests = 0;

  return async (method, params) => {
    await wire.send([
      {
        jsonrpc: '2.0',
        id: ++requests,
        method,
        params: { sessionId: 'acp-session', ...params },
      },
    ]);

    return wire.receive();
  };
};

// A Session's Shells with an in-memory launcher and a real database. `terminal` sends the Agent's terminal request and returns its response; `claim` is the Tool call that names a terminal.
export type MemoryShells = {
  shells: Shells;
  changes: ShellRecord[];
  commands: MemoryShellCommand[];
  database: Database;
  terminal: TerminalCall;
  claim: (terminalId: string, toolCallId: string) => void;
};

export const openMemoryShells = (): MemoryShells => {
  const { database, directory, remove } = openTestDatabase();
  onTestFinished(remove);
  const commands: MemoryShellCommand[] = [];
  const changes: ShellRecord[] = [];
  let created = 0;

  const shells = createShells(
    {
      sessionId: 'session-1',
      runtimeDirectory: directory,
      writer: startWriter(database, directory),
      now: Date.now,
      createId: () => `terminal-${++created}`,
    },
    {
      changed: (record) => changes.push(record),
      failed: (error) => {
        throw error;
      },
      launch: memoryLauncher(commands),
    },
  );

  shells.configure(session, resourceLaunch);

  const destination = shells.attach({
    update: () => {},
    failed: () => {},
    requestPermission: () => ({ outcome: { outcome: 'cancelled' } }),
    createElicitation: () => ({ action: 'cancel' }),
  });

  const claim = (terminalId: string, toolCallId: string): void => {
    const notification: SessionNotification = {
      sessionId: 'acp-session',
      update: {
        sessionUpdate: 'tool_call',
        toolCallId,
        title: 'Run',
        content: [{ type: 'terminal', terminalId }],
      },
    };

    destination.update(notification);
  };

  return {
    shells,
    changes,
    commands,
    database,
    terminal: agentSide(destination),
    claim,
  };
};
