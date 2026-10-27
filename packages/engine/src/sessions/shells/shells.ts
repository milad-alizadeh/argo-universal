import type { ShellRecord } from '@repo/contracts';
import type { AcpSessionDestination, AgentLaunch } from '../../agents';
import type { SessionData } from '../session-data';
import { ShellRuntime, type ShellRuntimeInput } from './shell-runtime';

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

export const createShells = (input: ShellRuntimeInput): Shells =>
  new ShellRuntime(input);

export const withShell = (
  shells: readonly ShellRecord[],
  shell: ShellRecord,
): ShellRecord[] => [...shells.filter(({ id }) => id !== shell.id), shell];
