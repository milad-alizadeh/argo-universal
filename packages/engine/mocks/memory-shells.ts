import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { SessionNotification } from '@agentclientprotocol/sdk';
import type { ShellRecord } from '@repo/contracts';
import { onTestFinished } from 'vitest';
import { createActor } from 'xstate';
import { createShells, type SessionData, type Shells } from '../src/sessions';
import { writerMachine, type WriterActorRef } from '../src/storage';
import { resourceLaunch } from './acp-resource';
import { openTestDatabase } from './database';
import { agentSide, type TerminalCall } from './memory-shell-acp';
import {
  memoryLauncher,
  type MemoryShellCommand,
} from './memory-shell-launcher';

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
  const observations: ShellObservations = { commands: [], changes: [] };

  const shells = fixtureShells(
    directory,
    startWriter(database, directory),
    observations,
  );

  shells.configure(session, resourceLaunch);

  return memoryShells(database, shells, observations);
};

const memoryShells = (
  database: Database,
  shells: Shells,
  observations: ShellObservations,
): MemoryShells => {
  const destination = attachShells(shells);

  return {
    shells,
    ...observations,
    database,
    terminal: agentSide(destination),
    claim: claimTerminal(destination),
  };
};

type ShellObservations = {
  commands: MemoryShellCommand[];
  changes: ShellRecord[];
};

const fixtureShells = (
  directory: string,
  writer: WriterActorRef,
  observations: ShellObservations,
): Shells =>
  createShells(shellInput(directory, writer), shellPorts(observations));

const shellInput = (
  directory: string,
  writer: WriterActorRef,
): Parameters<typeof createShells>[0] => {
  let created = 0;

  return {
    sessionId: 'session-1',
    runtimeDirectory: directory,
    writer,
    now: Date.now,
    createId: () => `terminal-${++created}`,
  };
};

const shellPorts = (
  observations: ShellObservations,
): Parameters<typeof createShells>[1] => ({
  changed: (record) => observations.changes.push(record),
  failed: (error) => {
    throw error;
  },
  launch: memoryLauncher(observations.commands),
});

const attachShells = (shells: Shells): ReturnType<Shells['attach']> =>
  shells.attach({
    update: () => {},
    failed: () => {},
    requestPermission: () => ({ outcome: { outcome: 'cancelled' } }),
    createElicitation: () => ({ action: 'cancel' }),
  });

const claimTerminal =
  (destination: ReturnType<Shells['attach']>): MemoryShells['claim'] =>
  (terminalId, toolCallId): void =>
    destination.update(terminalNotification(terminalId, toolCallId));

const terminalNotification = (
  terminalId: string,
  toolCallId: string,
): SessionNotification => ({
  sessionId: 'acp-session',
  update: {
    sessionUpdate: 'tool_call',
    toolCallId,
    title: 'Run',
    content: [{ type: 'terminal', terminalId }],
  },
});
