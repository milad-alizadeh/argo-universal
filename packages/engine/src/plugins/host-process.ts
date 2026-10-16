import { HostWorkers } from './host-workers.ts';
import { HostCommand } from './runtime-protocol.ts';

const workers = new HostWorkers((message) => process.send?.(message));

process.on('message', (value) => {
  const command = HostCommand.parse(value);

  if (command.type === 'activate') workers.activate(command);
  else if (command.type === 'reply') workers.reply(command);
  else workers.stop(command.pluginId);
});

// Losing the Engine also closes every worker, including hung workers.
process.once('disconnect', () => process.exit(0));

process.send?.({ type: 'ready' });
