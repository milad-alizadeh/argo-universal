import { HostWorkers } from './host-workers.ts';
import {
  HostCommand,
  type HostHook,
  type HostReply,
} from './runtime-protocol.ts';

const workers = new HostWorkers((message) => process.send?.(message));

function lifecycle(
  command: Extract<HostCommand, { type: 'event' | 'stop' }>,
): void {
  if (command.type === 'event') workers.event(command);
  else workers.stop(command.pluginId);
}

const isDelivery = (command: HostCommand): command is HostReply | HostHook =>
  command.type === 'reply' || command.type === 'hook';

function handle(command: HostCommand): void {
  if (command.type === 'activate') workers.activate(command);
  else if (isDelivery(command)) workers.deliver(command);
  else lifecycle(command);
}

process.on('message', (value) => handle(HostCommand.parse(value)));

// Losing the Engine also closes every worker, including hung workers.
process.once('disconnect', () => process.exit(0));

process.send?.({ type: 'ready' });
