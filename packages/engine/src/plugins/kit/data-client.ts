import type { PluginEvent, PluginViewId } from '@repo/contracts/plugins/wire';
import {
  DataSubscription,
  emptyData,
  type DataCall,
  type DataTarget,
  type DataSnapshot,
} from './data-subscription';

export class PluginDataClient {
  private readonly subscriptions = new Map<string, DataSubscription>();
  private next = 0;

  constructor(private readonly call: DataCall) {}

  nextId(): string {
    return String(++this.next);
  }

  receive(event: Extract<PluginEvent, { type: 'data' }>): void {
    this.subscriptions.get(event.watchId)?.accept(event.state);
  }

  ready(viewId: PluginViewId, background = false): boolean {
    return this.subscriptions
      .values()
      .filter(({ target }) => target.viewId === viewId)
      .every(
        (subscription) =>
          subscription.ready && (!background || subscription.settled),
      );
  }

  seen(watchId: string, version: number): void {
    const subscription = this.subscriptions.get(watchId);

    if (subscription) subscription.seen = version;
  }

  subscribe(
    target: DataTarget,
    changed: (snapshot: DataSnapshot) => void,
  ): () => void {
    changed(emptyData);

    if (target.viewId === null || target.identity === null)
      return (): void => {};

    const subscription = new DataSubscription(
      this.call,
      { ...target, viewId: target.viewId, identity: target.identity },
      changed,
    );

    this.start(subscription);

    return () => this.release(target.watchId, subscription);
  }

  private start(subscription: DataSubscription): void {
    this.subscriptions.set(subscription.target.watchId, subscription);
    subscription.start();
  }

  private release(watchId: string, subscription: DataSubscription): void {
    this.subscriptions.delete(watchId);
    subscription.close();
  }

  async refresh(target: DataTarget): Promise<void> {
    if (target.identity === null) return;

    if (target.viewId === null) return;
    await this.call({
      api: 'data',
      action: 'refresh',
      viewId: target.viewId,
      watchId: target.watchId,
    });
  }
}
