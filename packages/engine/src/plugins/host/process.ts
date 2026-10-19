import {
  HostCommand,
  type HostHook,
  type HostReply,
} from '../protocol/runtime-protocol.ts';
import { HostWorkers } from './workers.ts';

const workers = new HostWorkers((message) => process.send?.(message));

function lifecycle(
  command: Extract<
    HostCommand,
    { type: 'event' | 'stop' | 'waiting' | 'test' }
  >,
): void {
  if (isWorkerEvent(command)) workers.event(command);
  else if (command.type === 'waiting') workers.waiting(command);
  else workers.stop(command.pluginId);
}

const isWorkerEvent = (
  command: HostCommand,
): command is Extract<HostCommand, { type: 'event' | 'test' }> =>
  command.type === 'event' || command.type === 'test';

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
