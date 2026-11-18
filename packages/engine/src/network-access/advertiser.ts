import { networkInterfaces } from 'node:os';
import makeMdns from 'multicast-dns';
import type { LocalNetworkAccess } from './local-network-access';
import { type Announcement, Identity } from './service-identity';

export type { Announcement } from './service-identity';

// The address of every network interface this computer is on, one each: a multi-homed Server Device is reached on any of them.
export const interfaceAddresses = (): string[] =>
  Object.values(networkInterfaces())
    .map((addresses) =>
      addresses?.find((entry) => entry.family === 'IPv4' && !entry.internal),
    )
    .flatMap((entry) => (entry ? [entry.address] : []));

const secondsKept = 120;

const repeatAfter = 1000;

// One responder on one interface: it announces, answers what is asked of it, and says goodbye. mDNS answers leave by a single interface, so a Server on Wi-Fi and Ethernet needs one of these on each, or the phone on Wi-Fi hears nothing.
class Responder {
  private readonly identity: Identity;
  private readonly socket: ReturnType<typeof makeMdns>;
  private readonly repeat: ReturnType<typeof setTimeout>;
  private withdrawn = false;

  public constructor(
    private readonly address: string,
    announcement: Announcement,
    private readonly report: (line: string) => void,
  ) {
    this.identity = new Identity(announcement, address);
    this.socket = makeMdns({ interface: address, bind: '0.0.0.0' });
    this.listen();
    this.repeat = setTimeout(() => this.announce(), repeatAfter);
  }

  public async withdraw(): Promise<void> {
    this.withdrawn = true;
    clearTimeout(this.repeat);
    await this.send(0);
    await new Promise<void>((resolve): void => {
      this.socket.destroy((): void => resolve());
    });
  }

  // The library raises `error` for a port that is taken or forbidden, and a `warning` for everything else, an address that is gone or a failed join included. Either way this interface goes quiet and the Server carries on; an `error` nobody handles would end the process.
  private listen(): void {
    const failed = (cause: Error): void =>
      this.report(
        `could not announce the Server on ${this.address}: ${cause.message}`,
      );

    this.socket.on('error', failed);
    this.socket.on('warning', failed);
    this.socket.on('query', (query): void => this.answer(query.questions));
    this.socket.once('ready', (): void => this.announce());
  }

  // After a goodbye nothing may bring the record back.
  private answer(questions: readonly { name: string }[]): void {
    if (questions.some((asked) => this.identity.isAskedFor(asked.name)))
      this.announce();
  }

  private announce(): void {
    if (!this.withdrawn) void this.send(secondsKept);
  }

  private send(ttl: number): Promise<void> {
    return new Promise<void>((resolve): void => {
      this.socket.respond(
        { answers: this.identity.records(ttl) },
        (cause): void => {
          if (cause) this.report(`could not announce: ${cause.message}`);
          resolve();
        },
      );
    }).catch((cause: unknown): void => {
      this.report(`could not announce: ${String(cause)}`);
    });
  }
}

// Where the Server's interfaces are read from and how often they are read again; a test says both.
export interface NetworkWatch {
  addresses: () => string[];
  checkEveryMs: number;
}

const defaultWatch: NetworkWatch = {
  addresses: interfaceAddresses,
  checkEveryMs: 10_000,
};

class Announcer {
  private responders = new Map<string, Responder>();
  private queue: Promise<void> = Promise.resolve();
  private checking: ReturnType<typeof setInterval> | undefined;

  public constructor(
    private readonly announcement: Announcement,
    private readonly report: (line: string) => void,
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
    const now = new Set(this.watch.addresses());
    const before = [...this.responders.keys()];

    for (const [address, responder] of this.responders)
      if (!now.has(address)) this.drop(address, responder);

    for (const address of now) this.join(address);
    if (before.length !== now.size || before.some((one) => !now.has(one)))
      this.say([...now]);
  }

  private drop(address: string, responder: Responder): void {
    this.responders.delete(address);
    void responder.withdraw();
  }

  private join(address: string): void {
    if (this.responders.has(address)) return;

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

/*
 * Announces the Server over mDNS/Bonjour while Local network access is on, and says goodbye when it goes off (ADR-0045).
 * The switch is the only thing that decides: nothing here turns it on. Answers a function that withdraws the announcement, for the Server's own close.
 */
export function announceWhileLocalNetworkAccessIsOn(
  access: LocalNetworkAccess,
  announcement: Announcement,
  report: (line: string) => void,
  watch: NetworkWatch = defaultWatch,
): () => Promise<void> {
  const announcer = new Announcer(announcement, report, watch);

  const unsubscribe = access.subscribe((enabled): void => {
    void announcer.set(enabled);
  });

  // `subscribe` does not say what the switch is now; both calls are synchronous, so nothing slips between them.
  void announcer.set(access.enabled);

  return async (): Promise<void> => {
    unsubscribe();
    await announcer.set(false);
  };
}
