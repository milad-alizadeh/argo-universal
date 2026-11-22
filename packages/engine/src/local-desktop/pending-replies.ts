import type { RpcConnection } from '../rpc';

interface Waiting<Answer> {
  connection: RpcConnection;
  settle: (answer: Answer) => void;
}

interface Request<Answer> {
  connection: RpcConnection;
  signal: AbortSignal;
  disconnected: Answer;
  deadline?: { milliseconds: number; answer: Answer };
  send: (requestId: string) => void;
}

function startDeadline<Answer>(
  deadline: Request<Answer>['deadline'],
  settle: (answer: Answer) => void,
): ReturnType<typeof setTimeout> | undefined {
  return (
    deadline && setTimeout(() => settle(deadline.answer), deadline.milliseconds)
  );
}

// A reply belongs only to the Connection that received its request.
export class PendingReplies<Answer> {
  private readonly waiting = new Map<string, Waiting<Answer>>();
  private sequence = 0;

  public constructor(private readonly prefix = '') {}

  public get busy(): boolean {
    return this.waiting.size > 0;
  }

  public has(requestId: string): boolean {
    return this.waiting.has(requestId);
  }

  public ask(request: Request<Answer>): Promise<Answer> {
    if (request.signal.aborted) return Promise.resolve(request.disconnected);

    const requestId = this.prefix + ++this.sequence;
    const result = Promise.withResolvers<Answer>();

    const settle = (answer: Answer): void => {
      request.signal.removeEventListener('abort', gone);
      clearTimeout(timer);
      this.waiting.delete(requestId);
      result.resolve(answer);
    };

    const gone = (): void => settle(request.disconnected);

    const timer = startDeadline(request.deadline, settle);

    this.waiting.set(requestId, { connection: request.connection, settle });
    request.signal.addEventListener('abort', gone, { once: true });
    request.send(requestId);

    return result.promise;
  }

  public answer(
    connection: RpcConnection,
    { requestId, answer }: { requestId: string; answer: Answer },
  ): void {
    const waiting = this.waiting.get(requestId);

    if (waiting?.connection === connection) waiting.settle(answer);
  }
}
