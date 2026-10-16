import type { AcpSessionDestination } from '../../agents';
import type { ShellRuntime } from './shell-runtime';

type ShellDestination = {
  destination: AcpSessionDestination;
  shells: ShellRuntime;
  closeStatus: () => 'lost' | 'stopped';
};

export const withShellDestination = (
  input: ShellDestination,
): AcpSessionDestination => ({
  ...input.destination,
  terminalRequests: input.shells.requests(),
  closeShells: () => input.shells.close(input.closeStatus()),
  update: (notification) => {
    input.shells.associate(notification);

    return input.destination.update(notification);
  },
  failed: (error) => {
    void input.shells.close('lost').catch(console.error);
    input.destination.failed(error);
  },
});
