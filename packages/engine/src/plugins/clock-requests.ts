import { ClockCommand, type ClockReply } from './clock-protocol';
import type { HostCommand } from './runtime-protocol';

const clockLimitMs = 3000;

type PendingClock = ReturnType<typeof Promise.withResolvers<void>>;

type HostClock = Extract<HostCommand, { type: 'clock.advance' }>;

type ClockRequest = { command: HostClock; pending: PendingClock };

export class ClockRequests {
  private next = 0;
  private readonly pending = new Map<number, PendingClock>();
  constructor(private readonly tell: (command: HostClock) => void) {}

  async advance(pluginId: string, ms: number): Promise<void> {
    const { command, pending } = this.request(pluginId, ms);
    const timeout = clockDeadline(pending.reject);

    try {
      this.tell(command);
      await pending.promise;
    } finally {
      clearTimeout(timeout);
      this.pending.delete(command.id);
    }
  }

  private request(pluginId: string, ms: number): ClockRequest {
    const id = this.next++;

    const command = {
      ...ClockCommand.parse({ type: 'clock.advance', id, ms }),
      pluginId,
    };

    const pending = Promise.withResolvers<void>();
    this.pending.set(id, pending);

    return { command, pending };
  }

  settle(reply: ClockReply): void {
    const pending = this.pending.get(reply.id);

    if (!pending) return;

    if (reply.error) pending.reject(new Error(reply.error));
    else pending.resolve();
  }
}

function clockDeadline(
  reject: (reason: Error) => void,
): ReturnType<typeof setTimeout> {
  return setTimeout(
    () => reject(new Error('Plugin test clock timed out')),
    clockLimitMs,
  );
}
