import type { AcpSessionDestination, TerminalRequests } from '../../agents';
import { terminalReferences } from './shell-data';
import type { ShellRuntime } from './shell-runtime';

const requests = (shells: ShellRuntime): TerminalRequests => ({
  'terminal/create': ({ params }) => shells.create(params),
  'terminal/output': ({ params }) =>
    shells.requireTerminal(params.terminalId).output(),
  'terminal/kill': ({ params }) =>
    shells.requireTerminal(params.terminalId).kill(),
  'terminal/wait_for_exit': ({ params, signal }) =>
    shells.requireTerminal(params.terminalId).wait(signal),
  'terminal/release': ({ params }) =>
    shells.requireTerminal(params.terminalId).release(),
});

// The Agent's terminal requests run the Shells, and a Tool call that names a terminal claims it.
export const attachShellRuntime = (
  shells: ShellRuntime,
  destination: AcpSessionDestination,
): AcpSessionDestination => ({
  ...destination,
  terminalRequests: requests(shells),
  update: (notification) => {
    for (const reference of terminalReferences(notification.update))
      shells.associate(reference.terminalId, reference.toolCallId);

    return destination.update(notification);
  },
});
