import type { SDKUserMessage } from '@anthropic-ai/claude-agent-sdk';
type PendingPrompt = {
  message: SDKUserMessage;
  dispatched: PromiseWithResolvers<void>;
};
class PromptQueue {
  private waiting: PendingPrompt[] = [];
  private wake: (() => void) | null = null;
  private dispatching: PromiseWithResolvers<void> | null = null;
  private ended = false;
  public prompts = this.read();
  public push(message: SDKUserMessage): Promise<void> {
    const dispatched = Promise.withResolvers<void>();
    this.waiting.push({ message, dispatched });
    this.notify();
    return dispatched.promise;
  }
  public end(): void {
    this.ended = true;
    this.dispatching?.resolve();
    for (const { dispatched } of this.waiting.splice(0)) dispatched.resolve();
    this.notify();
  }
  private notify(): void {
    this.wake?.();
    this.wake = null;
  }
  private async *read(): AsyncGenerator<SDKUserMessage> {
    while (true) {
      const next = await this.next();
      if (!next) return;
      yield* this.dispatch(next);
    }
  }
  private async next(): Promise<PendingPrompt | undefined> {
    const next = this.waiting.shift();
    if (next) return next;
    if (this.ended) return undefined;
    await this.wait();
    return this.next();
  }
  private async *dispatch(next: PendingPrompt): AsyncGenerator<SDKUserMessage> {
    this.dispatching = next.dispatched;
    try {
      yield next.message;
    } finally {
      next.dispatched.resolve();
      this.dispatching = null;
    }
  }
  private wait(): Promise<void> {
    return new Promise<void>((resolve): void => {
      this.wake = resolve;
    });
  }
}
export const createPromptQueue = (): PromptQueue => new PromptQueue();
