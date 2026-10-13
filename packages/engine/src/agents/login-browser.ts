import type { LoginAgentRequest } from './agent-launch';

type BrowserAnswer = { action: 'accept' | 'cancel' };

type BrowserEvents = {
  requested: () => void;
  answered: () => void;
  cancelled: () => void;
};

export class LoginBrowser {
  private pending?: LoginAgentRequest;
  private answer?: ReturnType<typeof Promise.withResolvers<BrowserAnswer>>;
  private disposeSignal?: () => void;
  public constructor(private readonly events: BrowserEvents) {}
  public request(): LoginAgentRequest | undefined {
    return this.pending;
  }
  public create(
    request: LoginAgentRequest,
    signal?: AbortSignal,
  ): Promise<BrowserAnswer> {
    if (this.pending)
      return Promise.reject(new Error('Another login request is pending'));

    if (signal?.aborted) return this.answerCancelled();
    this.pending = request;
    this.answer = Promise.withResolvers<BrowserAnswer>();
    this.watchCancellation(signal);
    this.events.requested();

    return this.answer.promise;
  }
  public respond(input: {
    requestId: string;
    action: BrowserAnswer['action'];
  }): void {
    if (!this.pending || this.pending.id !== input.requestId || !this.answer)
      throw new Error('Login request is no longer pending');
    this.resolve(input.action);
    this.events.answered();

    if (input.action === 'cancel') this.events.cancelled();
  }
  public cancel(): void {
    this.resolve('cancel');
  }
  private answerCancelled(): Promise<BrowserAnswer> {
    this.events.cancelled();

    return Promise.resolve({ action: 'cancel' });
  }
  private watchCancellation(signal?: AbortSignal): void {
    const cancel = (): void => this.events.cancelled();
    signal?.addEventListener('abort', cancel, { once: true });
    this.disposeSignal = (): void =>
      signal?.removeEventListener('abort', cancel);
  }
  private resolve(action: BrowserAnswer['action']): void {
    this.disposeSignal?.();
    this.answer?.resolve({ action });
    this.pending = undefined;
    this.answer = undefined;
    this.disposeSignal = undefined;
  }
}
