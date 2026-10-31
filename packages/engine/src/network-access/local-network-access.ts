import type { Database } from '@repo/db';
import { localNetworkAccess } from '@repo/db/schema';
import {
  writeDatabaseJobAndWaitForCommit,
  type StorageTransaction,
  type WriterActorRef,
  type WriterJob,
} from '../storage';

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
  private rebind: Rebind = () => Promise.resolve();
  private pending: Promise<unknown> = Promise.resolve();
  private readonly listeners = new Set<NetworkAccessListener>();

  public constructor(
    private readonly database: Database,
    private readonly writer: WriterActorRef,
  ) {
    this.current = readLocalNetworkAccess(database);
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

  private async apply(enabled: boolean): Promise<void> {
    if (enabled === this.current) return;
    await this.rebind(enabled);
    await this.store(enabled);

    this.current = enabled;

    for (const listener of this.listeners) listener(enabled);
  }

  // A choice that cannot be stored is not kept: the listener goes back to where it was.
  private async store(enabled: boolean): Promise<void> {
    try {
      await writeDatabaseJobAndWaitForCommit(
        this.writer,
        new NetworkAccessJob(enabled),
      );
    } catch (error) {
      await this.rebind(this.current);
      throw error;
    }
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
