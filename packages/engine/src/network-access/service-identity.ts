import { createHash } from 'node:crypto';
import {
  discoveryKeyField,
  discoveryProtocol,
  discoveryServiceType,
} from '@repo/contracts';
import type makeMdns from 'multicast-dns';

export interface Announcement {
  // The computer's name, what an App lists the Server by.
  name: string;
  // The Server's static public key; an App recognises its Server by it even after a rename.
  key: string;
  port: number;
}

const labelLimit = 50;

const hostDigits = 12;

// A DNS label holds no dot and is short.
const labelOf = (name: string): string =>
  name.replaceAll('.', '-').slice(0, labelLimit);

const listing = `_${discoveryServiceType}._${discoveryProtocol}.local`;

// What a Server says about itself on one interface. Its own host name, made from the key, never the computer's: the system already answers for that one, with an address of its own choosing.
interface ServiceTarget {
  port: number;
  target: string;
}

export class Identity {
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

  private srv(): ServiceTarget {
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
