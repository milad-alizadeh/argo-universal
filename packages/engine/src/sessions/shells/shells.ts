import type { ShellRecord } from '@repo/contracts';
import type { AcpSessionDestination, AgentLaunch } from '../../agents';
import type { SessionData } from '../session-data';
import {
  ShellRuntime,
  type ShellReports,
  type ShellSession,
} from './shell-runtime';

export type { ShellReports, ShellSession };

// What a Session calls on its Shells. The Agent's terminal requests arrive through `attach` and the launch through `configure`; everything else a Shell does (output capture, storage, exit) the module keeps to itself.
export type Shells = {
  // The destination gains the Agent's terminal requests and learns which Tool call owns which terminal.
  attach: (destination: AcpSessionDestination) => AcpSessionDestination;
  // Shells run with the connection's launch and the Session's Checkout.
  configure: (session: SessionData, launch: AgentLaunch) => void;
  canStop: (id: string) => boolean;
  stop: (id: string) => void;
  // Kills every running Shell and records it with the status; later requests are refused.
  close: (status: 'lost' | 'stopped') => Promise<void>;
};

// Takes the Session's machine input as it is; the Shells keep only the fields they use.
export const createShells = (
  session: ShellSession,
  reports: ShellReports,
): Shells =>
  new ShellRuntime({
    sessionId: session.sessionId,
    runtimeDirectory: session.runtimeDirectory,
    writer: session.writer,
    now: session.now,
    createId: session.createId,
    ...reports,
  });

export const withShell = (
  shells: readonly ShellRecord[],
  shell: ShellRecord,
): ShellRecord[] => [...shells.filter(({ id }) => id !== shell.id), shell];
