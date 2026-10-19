import type { HostCommand } from '../protocol/runtime';
import {
  TestCommand,
  type TestAction,
  type TestReply,
} from '../protocol/test-control';

const testLimitMs = 3000;

type PendingTest = ReturnType<typeof Promise.withResolvers<void>>;

type HostTest = Extract<HostCommand, { type: 'test' }>;

type TestRequest = { command: HostTest; pending: PendingTest };

export class TestRequests {
  private next = 0;
  private readonly pending = new Map<number, PendingTest>();
  constructor(private readonly tell: (command: HostTest) => void) {}

  public async send(pluginId: string, action: TestAction): Promise<void> {
    const { command, pending } = this.request(pluginId, action);
    const timeout = testDeadline(pending.reject);

    try {
      this.tell(command);
      await pending.promise;
    } finally {
      clearTimeout(timeout);
      this.pending.delete(command.id);
    }
  }

  private request(pluginId: string, action: TestAction): TestRequest {
    const id = this.next++;

    const command = {
      ...TestCommand.parse({ type: 'test', id, action }),
      pluginId,
    };

    const pending = Promise.withResolvers<void>();
    this.pending.set(id, pending);

    return { command, pending };
  }

  public settle(reply: TestReply): void {
    const pending = this.pending.get(reply.id);

    if (!pending) return;

    if (reply.error) pending.reject(new Error(reply.error));
    else pending.resolve();
  }
}

function testDeadline(
  reject: (reason: Error) => void,
): ReturnType<typeof setTimeout> {
  return setTimeout(
    () => reject(new Error('Plugin test request timed out')),
    testLimitMs,
  );
}
