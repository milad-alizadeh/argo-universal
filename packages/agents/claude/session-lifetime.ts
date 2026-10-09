import type { Query } from '@anthropic-ai/claude-agent-sdk';
import type { createPromptQueue } from './prompt-queue';
import type { Requests } from './request-tracker';
const requestCancellationLimitMs = 3000;
class SessionLifetime {
  public readonly controller = new AbortController();
  private stopping = false;
  private vendor: Query | undefined;
  private stoppingRequests: Promise<void> | undefined;
  private signal: AbortSignal;
  private queue: ReturnType<typeof createPromptQueue>;
  private requests: Requests;
  public constructor(
    signal: AbortSignal,
    queue: ReturnType<typeof createPromptQueue>,
    requests: Requests,
  ) {
    this.signal = signal;
    this.queue = queue;
    this.requests = requests;
  }
  public attach(vendor: Query): void {
    this.vendor = vendor;
  }
  public listen(): void {
    this.signal.addEventListener('abort', this.abort, { once: true });
  }
  public isStopping(): boolean {
    return this.stopping;
  }
  public stopRequests(): Promise<void> {
    this.stoppingRequests ??= cancelRequests(this.requests, this.vendor);
    return this.stoppingRequests;
  }
  public detach(): void {
    this.signal.removeEventListener('abort', this.abort);
    this.stopping = true;
    this.queue.end();
  }
  private abort = (): void => {
    this.stopping = true;
    this.queue.end();
    void this.stopRequests().finally((): void => this.controller.abort());
  };
}
async function cancelRequests(
  requests: Requests,
  vendor: Query | undefined,
): Promise<void> {
  if (!requests.cancel() || !vendor) return;
  await interruptRequests(vendor);
}
function interruptRequests(vendor: Query): Promise<void> {
  return new Promise<void>((resolve): void => {
    const deadline = setTimeout(resolve, requestCancellationLimitMs);
    void vendor
      .interrupt()
      .catch((): void => {})
      .finally((): void => {
        clearTimeout(deadline);
        resolve();
      });
  });
}
export const createSessionLifetime = (
  signal: AbortSignal,
  queue: ReturnType<typeof createPromptQueue>,
  requests: Requests,
): SessionLifetime => new SessionLifetime(signal, queue, requests);
export type Lifetime = ReturnType<typeof createSessionLifetime>;
