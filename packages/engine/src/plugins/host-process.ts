import { HostWorkers } from './host-workers.ts';
import {
  HostCommand,
  type HostHook,
  type HostReply,
} from './runtime-protocol.ts';

const workers = new HostWorkers((message) => process.send?.(message));

function lifecycle(
  command: Extract<
    HostCommand,
    { type: 'event' | 'stop' | 'waiting' | 'clock.advance' }
  >,
): void {
  if (isWorkerEvent(command)) workers.event(command);
  else if (command.type === 'waiting') workers.waiting(command);
  else workers.stop(command.pluginId);
}

const isWorkerEvent = (
  command: HostCommand,
): command is Extract<HostCommand, { type: 'event' | 'clock.advance' }> =>
  command.type === 'event' || command.type === 'clock.advance';

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
