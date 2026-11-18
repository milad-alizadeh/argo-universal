import { Responder } from './responder';
import type { Announcement } from './service-identity';

// Where the Server's interfaces are read from and how often they are read again; a test says both.
export interface NetworkWatch {
  addresses: () => string[];
  checkEveryMs: number;
}

export type Report = (line: string) => void;

export class Announcer {
  private readonly responders = new Map<string, Responder>();
  private queue: Promise<void> = Promise.resolve();
  private checking: ReturnType<typeof setInterval> | undefined;

  public constructor(
    private readonly announcement: Announcement,
    private readonly report: Report,
    private readonly watch: NetworkWatch,
  ) {}

  // Changes are applied one at a time, in the order they arrive.
  public set(on: boolean): Promise<void> {
    return this.enqueue(() => (on ? this.start() : this.stop()));
  }

  private enqueue(change: () => void | Promise<void>): Promise<void> {
    this.queue = this.queue.then(change).catch((cause: unknown): void => {
      this.report(`could not change the announcement: ${String(cause)}`);
    });

    return this.queue;
  }

  private start(): void {
    if (this.checking) return;

    this.checking = setInterval(() => {
      void this.enqueue(() => this.follow());
    }, this.watch.checkEveryMs);

    this.checking.unref();
    this.follow();
  }

  // A laptop that moves to another network keeps announcing the old addresses until its interfaces are read again.
  private follow(): void {
    const now = this.watch.addresses();

    if (this.reconcile(new Set(now))) this.say(now);
  }

  // Answers whether anything changed.
  private reconcile(now: ReadonlySet<string>): boolean {
    const gone = [...this.responders.keys()].filter((one) => !now.has(one));
    const added = [...now].filter((one) => !this.responders.has(one));

    for (const address of gone) this.drop(address);

    for (const address of added) this.join(address);

    return gone.length + added.length > 0;
  }

  private drop(address: string): void {
    void this.responders.get(address)?.withdraw();
    this.responders.delete(address);
  }

  private join(address: string): void {
    this.responders.set(
      address,
      new Responder(address, this.announcement, this.report),
    );
  }

  // What the Server announced and where, so a phone that finds nothing can be compared with what was said.
  private say(addresses: readonly string[]): void {
    const { name, port } = this.announcement;

    this.report(
      `announcing "${name}" on ${addresses.join(', ') || 'no network'} port ${port}`,
    );
  }

  private async stop(): Promise<void> {
    clearInterval(this.checking);
    this.checking = undefined;
    const responders = [...this.responders.values()];
    this.responders.clear();

    await Promise.all(responders.map((responder) => responder.withdraw()));
  }
}
