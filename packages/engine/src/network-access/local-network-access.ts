import type { Database } from '@repo/db';
import { localNetworkAccess } from '@repo/db/schema';
import { createRejectionCounter } from '@repo/machine-log';
import {
  writeDatabaseJobAndWaitForCommit,
  type StorageTransaction,
  type WriterActorRef,
  type WriterJob,
} from '../storage';

const rejections = createRejectionCounter('engine');

export type NetworkAccessListener = (enabled: boolean) => void;

// Moves the Server's listener between loopback and the local network; rejects when it cannot.
export type Rebind = (enabled: boolean) => Promise<void>;

export const readLocalNetworkAccess = (database: Database): boolean =>
  database.select().from(localNetworkAccess).get()?.enabled ?? false;

/*
 * Whether the Server is reachable beyond the computer it runs on. Off until the owner turns it on; the choice is stored, so a restart keeps it.
 * The Engine reads `enabled` and `subscribe`s to change: whatever advertises the Server (#1494) hooks in here, and nothing else turns it on.
 */
export class LocalNetworkAccess {
  private current: boolean;
  // What the database holds; it differs from `current` only after a failed revert, until a later change stores it.
  private stored: boolean;
  private rebind: Rebind = () => Promise.resolve();
  private pending: Promise<unknown> = Promise.resolve();
  private readonly listeners = new Set<NetworkAccessListener>();

  public constructor(
    private readonly database: Database,
    private readonly writer: WriterActorRef,
  ) {
    this.current = readLocalNetworkAccess(database);
    this.stored = this.current;
  }

  public get enabled(): boolean {
    return this.current;
  }

  // The HTTP server says how to move its listener once it exists.
  public useBinding(rebind: Rebind): void {
    this.rebind = rebind;
  }

  public subscribe(listener: NetworkAccessListener): () => void {
    this.listeners.add(listener);

    return (): void => {
      this.listeners.delete(listener);
    };
  }

  // Changes are applied one at a time, in the order they arrive.
  public set(enabled: boolean): Promise<void> {
    const applied = this.pending.then(() => this.apply(enabled));
    this.pending = applied.catch((): void => undefined);

    return applied;
  }

  // Binding comes first and does nothing when the listener is already there and listening, so setting the value again repairs a listener that lost its address.
  private async apply(enabled: boolean): Promise<void> {
    await this.rebind(enabled);

    if (enabled !== this.stored) await this.store(enabled);
    this.adopt(enabled);
  }

  // A choice that cannot be stored is not kept: the listener goes back to where it was.
  private async store(enabled: boolean): Promise<void> {
    try {
      await writeDatabaseJobAndWaitForCommit(
        this.writer,
        new NetworkAccessJob(enabled),
      );
      this.stored = enabled;
    } catch (error) {
      await this.revert(enabled, error);
      throw error;
    }
  }

  // If the listener cannot go back either, what the Engine reports follows where it really is, so the two never disagree. The database keeps the old choice, so the error says so: a restart returns to it until the owner sets this again.
  private async revert(bound: boolean, cause: unknown): Promise<void> {
    try {
      await this.rebind(this.current);
    } catch (revertError) {
      this.adopt(bound);
      throw new AggregateError(
        [cause, revertError],
        `Local network access is ${state(bound)} now but could not be stored or undone; a restart returns it to ${state(this.stored)}`,
      );
    }
  }

  // A subscriber that throws is reported and skipped: the change is already made.
  private adopt(enabled: boolean): void {
    if (enabled === this.current) return;
    this.current = enabled;

    for (const listener of this.listeners) notify(listener, enabled);
  }
}

const state = (enabled: boolean): string => (enabled ? 'on' : 'off');

function notify(listener: NetworkAccessListener, enabled: boolean): void {
  try {
    listener(enabled);
  } catch (error) {
    rejections.report('Local network access subscriber failed', error);
  }
}

class NetworkAccessJob implements WriterJob {
  public constructor(private readonly enabled: boolean) {}
  public describe(): string {
    return 'change Local network access';
  }
  public commit(transaction: StorageTransaction): void {
    const row = { singleton: 1, enabled: this.enabled };
    transaction
      .insert(localNetworkAccess)
      .values(row)
      .onConflictDoUpdate({ target: localNetworkAccess.singleton, set: row })
      .run();
  }
}
