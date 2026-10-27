import type { AcpSessionDestination } from '../agents';
import type { ShellRuntime } from './shell-runtime';

export const withShellDestination = (
  destination: AcpSessionDestination,
  shells: ShellRuntime,
): AcpSessionDestination => ({
  ...destination,
  terminalRequests: shells.requests(),
  update: (notification) => {
    shells.associate(notification);

    return destination.update(notification);
  },
});
