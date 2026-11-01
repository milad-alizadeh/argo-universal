import type {
  PairingClaim,
  PairingRegistration,
  PairingWelcome,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import type { PairingRegistrations } from '../pairing/registrations';
import type { PairingTickets } from '../pairing/tickets';
import { storedPublicKey } from '../pairing/x25519';
import { serverDeviceIdentity, type RpcIdentity } from '../rpc/identity';
import type { WriterActorRef } from '../storage';
import {
  followLastSeen,
  readDeviceByPublicKey,
  recordPairedDevice,
  type PairedDeviceInput,
} from './paired-device';

export interface DeviceAdmissionDeps {
  readonly database: Database;
  readonly databaseWriter: WriterActorRef;
  readonly tickets: PairingTickets;
  // Where a Device that has just spent a Ticket is held until the owner answers, and reported so the open pair sheet can name it.
  readonly registrations: PairingRegistrations;
  readonly createId: () => string;
  readonly now: () => number;
}

// What a Device is told, and who the Server will treat it as from now on; a refused Device gets no identity and therefore reaches nothing.
export interface Admission {
  readonly welcome: PairingWelcome;
  readonly identity?: RpcIdentity;
}

/*
 * Whether a Device Key that has just authenticated itself belongs to a Device this Server trusts, and what to do when it does not (ADR-0045).
 * A Device the Server already has a row for authenticates as itself; one it does not must spend a Pairing Ticket and then be allowed by the owner to get a row, and from then on the Ticket is spent and the key is the credential.
 */
export class DeviceAdmission {
  public constructor(private readonly deps: DeviceAdmissionDeps) {}

  public async admit(
    deviceKey: Buffer,
    claim: PairingClaim,
    source: string,
  ): Promise<Admission> {
    const publicKey = storedPublicKey(deviceKey);
    const known = readDeviceByPublicKey(this.deps.database, publicKey);

    return known
      ? this.welcomeBack(known)
      : this.pair(publicKey, claim, source);
  }

  private async welcomeBack(
    known: NonNullable<ReturnType<typeof readDeviceByPublicKey>>,
  ): Promise<Admission> {
    await followLastSeen(this.deps.databaseWriter, known.id, this.deps.now());

    return {
      welcome: { paired: true, deviceId: known.id },
      identity: known.serverDevice
        ? serverDeviceIdentity
        : { serverDevice: false, deviceId: known.id },
    };
  }

  private async pair(
    publicKey: string,
    claim: PairingClaim,
    source: string,
  ): Promise<Admission> {
    if (claim.ticket === undefined)
      return refused({ paired: false, refusal: 'ticket-required' });
    const refusal = this.deps.tickets.spend(claim.ticket, source);

    return refusal
      ? refused({ paired: false, refusal })
      : this.register(publicKey, claim);
  }

  /*
   * The Ticket got this Device a place in the owner's queue, not a row: the Device waits, with no identity, until the owner allows it on the pair sheet (ADR-0045).
   * Writing it down is the Allow, so a Device that is declined or never answered leaves nothing behind.
   */
  private async register(
    publicKey: string,
    claim: PairingClaim,
  ): Promise<Admission> {
    const id = this.deps.createId();

    const write = (): Promise<void> =>
      this.writeDown({ id, publicKey, claim, now: this.deps.now() });

    const answer = await this.deps.registrations.ask(
      registration(id, claim),
      write,
    );

    return answer === 'allowed'
      ? paired(id)
      : refused({ paired: false, refusal: answer });
  }

  private writeDown(input: PairedDeviceInput): Promise<void> {
    return recordPairedDevice(this.deps.databaseWriter, input);
  }
}

// What the open pair sheet names in its prompt: the Device's own claim about itself, which decides nothing.
const registration = (
  deviceId: string,
  claim: PairingClaim,
): PairingRegistration => ({
  deviceId,
  claimedName: claim.name,
  claimedPlatform: claim.platform,
});

// From here on this Device authenticates with its own key, and the Ticket it spent is spent.
const paired = (deviceId: string): Admission => ({
  welcome: { paired: true, deviceId },
  identity: { serverDevice: false, deviceId },
});

const refused = (welcome: PairingWelcome): Admission => ({ welcome });
