import { createHash } from 'node:crypto';
import { networkInterfaces } from 'node:os';
import {
  discoveryKeyField,
  discoveryProtocol,
  discoveryServiceType,
} from '@repo/contracts';
import makeMdns from 'multicast-dns';
import type { LocalNetworkAccess } from './local-network-access';

export interface Announcement {
  // The computer's name, what an App lists the Server by.
  name: string;
  // The Server's static public key; an App recognises its Server by it even after a rename.
  key: string;
  port: number;
}

// The address of every network interface this computer is on, one each: a multi-homed Server Device is reached on any of them.
export const interfaceAddresses = (): string[] =>
  Object.values(networkInterfaces())
    .map((addresses) =>
      addresses?.find((entry) => entry.family === 'IPv4' && !entry.internal),
    )
    .flatMap((entry) => (entry ? [entry.address] : []));

const labelLimit = 50;

const hostDigits = 12;

// A DNS label holds no dot and is short.
const labelOf = (name: string): string =>
  name.replaceAll('.', '-').slice(0, labelLimit);

const listing = `_${discoveryServiceType}._${discoveryProtocol}.local`;

// What a Server says about itself on one interface. Its own host name, made from the key, never the computer's: the system already answers for that one, with an address of its own choosing.
class Identity {
  public readonly instance: string;
  public readonly host: string;

  public constructor(
    private readonly announcement: Announcement,
    private readonly address: string,
  ) {
    this.instance = `${labelOf(announcement.name)}.${listing}`;

    const digest = createHash('sha256').update(announcement.key).digest('hex');

    this.host = `argo-${digest.slice(0, hostDigits)}.local`;
  }

  // Everything an App needs to reach the Server from this interface, and only this interface's address: another subnet's address is no use to the phone asking.
  public records(ttl: number): Answer[] {
    return [
      { name: listing, type: 'PTR', ttl, data: this.instance },
      { name: this.instance, type: 'SRV', ttl, flush: true, data: this.srv() },
      { name: this.instance, type: 'TXT', ttl, flush: true, data: this.txt() },
      { name: this.host, type: 'A', ttl, flush: true, data: this.address },
    ];
  }

  public isAskedFor(name: string): boolean {
    return [listing, this.instance, this.host].some(
      (own) => own.toLowerCase() === name.toLowerCase(),
    );
  }

  private srv() {
    return { port: this.announcement.port, target: this.host };
  }

  private txt(): Buffer[] {
    return [Buffer.from(`${discoveryKeyField}=${this.announcement.key}`)];
  }
}

type Response = Exclude<
  Parameters<ReturnType<typeof makeMdns>['respond']>[0],
  unknown[]
>;

type Answer = NonNullable<Response['answers']>[number];

const secondsKept = 120;

const repeatAfter = 1000;

// One responder on one interface: it announces, answers what is asked of it, and says goodbye. mDNS answers leave by a single interface, so a Server on Wi-Fi and Ethernet needs one of these on each, or the phone on Wi-Fi hears nothing.
class Responder {
  private readonly identity: Identity;
  private readonly socket: ReturnType<typeof makeMdns>;
  private readonly repeat: NodeJS.Timeout;

  public constructor(
    address: string,
    announcement: Announcement,
    report: (line: string) => void,
  ) {
    this.identity = new Identity(announcement, address);
    this.socket = makeMdns({ interface: address, bind: '0.0.0.0' });

    // An `error` nobody handles ends the process; the Server outlives a failed announcement.
    this.socket.on('error', (error): void => {
      report(`could not announce the Server on ${address}: ${error.message}`);
    });
    this.socket.on('query', (query): void => this.answer(query.questions));
    this.announce();
    this.repeat = setTimeout(() => this.announce(), repeatAfter).unref();
  }

  public async withdraw(): Promise<void> {
    clearTimeout(this.repeat);
    await this.send(0);
    await new Promise<void>((resolve): void => {
      this.socket.destroy((): void => resolve());
    });
  }

  private answer(questions: readonly { name: string }[]): void {
    if (questions.some((asked) => this.identity.isAskedFor(asked.name)))
      this.announce();
  }

  private announce(): void {
    void this.send(secondsKept);
  }

  private send(ttl: number): Promise<void> {
    return new Promise<void>((resolve): void => {
      this.socket.respond({ answers: this.identity.records(ttl) }, (): void =>
        resolve(),
      );
    });
  }
}

class Announcer {
  private responders: Responder[] = [];
  private queue: Promise<void> = Promise.resolve();

  public constructor(
    private readonly announcement: Announcement,
    private readonly report: (line: string) => void,
  ) {}

  // Changes are applied one at a time, in the order they arrive.
  public set(on: boolean): Promise<void> {
    this.queue = this.queue.then(() => (on ? this.start() : this.stop()));

    return this.queue;
  }

  private start(): void {
    if (this.responders.length > 0) return;

    this.responders = interfaceAddresses().map(
      (address) => new Responder(address, this.announcement, this.report),
    );
  }

  private async stop(): Promise<void> {
    const responders = this.responders.splice(0);

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
): () => Promise<void> {
  const announcer = new Announcer(announcement, report);

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
