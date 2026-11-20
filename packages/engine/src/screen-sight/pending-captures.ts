import type {
  AppScreenshotResult,
  ScreenSightReply,
} from '@repo/contracts/operations';
import type { RpcConnection } from '../rpc';

interface Asked {
  connection: RpcConnection;
  settle: (result: AppScreenshotResult) => void;
}

/*
 * The capture requests sent to an App and not yet answered. Only the Connection that was asked can answer one, and a
 * Connection that closes first leaves its request answered `not_opened`, so no reader waits on a picture that cannot come.
 */
export class PendingCaptures {
  private readonly asked = new Map<string, Asked>();
  private count = 0;

  // Sends the request through `send` and resolves with what the App answers.
  public ask(
    connection: RpcConnection,
    send: (requestId: string) => void,
  ): Promise<AppScreenshotResult> {
    this.count += 1;
    const requestId = `screen-${this.count}`;
    const answered = Promise.withResolvers<AppScreenshotResult>();

    this.asked.set(requestId, this.waiting(requestId, connection, answered));
    send(requestId);

    return answered.promise;
  }

  private waiting(
    requestId: string,
    connection: RpcConnection,
    answered: PromiseWithResolvers<AppScreenshotResult>,
  ): Asked {
    const settle = (result: AppScreenshotResult): void => {
      connection.signal.removeEventListener('abort', gone);
      this.asked.delete(requestId);
      answered.resolve(result);
    };

    const gone = (): void => settle({ status: 'not_opened' });

    connection.signal.addEventListener('abort', gone, { once: true });

    return { connection, settle };
  }

  public answer(connection: RpcConnection, reply: ScreenSightReply): void {
    const asked = this.asked.get(reply.requestId);

    if (asked?.connection === connection) asked.settle(reply.answer);
  }
}
