import { expect } from '@playwright/test';
import {
  connectAsDevice,
  type ChannelTestHost,
  type TestDevice,
} from '@repo/engine/mocks/engine-channel';
import { accepts, addressBeyondLoopback } from './network-probe';
import {
  type Asking,
  connectOwner,
  onlyOne,
  type Owner,
  watchForDevice,
} from './owner';

/*
 * A second App on this computer: the Engine's own channel client, which opens a real socket to the Server's real address and runs the shipped handshake.
 * The first App is the page the scenario already has; this one is what a phone is to it, a Device that is paired and then reads through the channel only (ADR-0045).
 */
export class SecondApp {
  readonly name = 'Second App';

  private readonly owner: Owner;
  private readonly httpUrl: string;
  private readonly port: number;
  private address: string | undefined;
  private device: TestDevice | undefined;
  private asking: Asking | undefined;

  constructor(httpUrl: string) {
    const url = new URL(httpUrl);
    this.httpUrl = httpUrl;
    this.port = Number(url.port);
    this.owner = connectOwner(`ws://${url.host}`);
  }

  async allowLocalNetwork(): Promise<void> {
    await this.owner.client.network.setLocalAccess.mutate({ enabled: true });
    this.address = await addressBeyondLoopback(this.port);
  }

  async pair(): Promise<void> {
    const { invite } = await this.owner.client.pairing.mint.mutate();
    this.asking = await watchForDevice(this.owner);

    this.device = await connectAsDevice(this.hostFor(invite.key, this.asking), {
      ticket: invite.ticket,
      name: this.name,
      platform: 'android',
      host: this.address ?? noAddress(),
    });
  }

  async sessionTitles(): Promise<string[]> {
    const { sessions } = await (
      this.device ?? noDevice()
    ).caller.session.list.query({ archived: false });

    return sessions.map((session) => session.title);
  }

  async pairedDeviceNames(): Promise<string[]> {
    const devices = await this.owner.client.devices.list.query();

    return devices.filter((row) => !row.serverDevice).map((row) => row.name);
  }

  async unpair(): Promise<void> {
    const { deviceId } = this.device ?? noDevice();
    await this.owner.client.devices.unpair.mutate({ deviceId });
  }

  /*
   * The Server's own stop, with Local network access still on: neither its loopback address nor the computer's other address answers while it is stopped, so a Server that kept listening would fail here.
   */
  async expectNothingListening(
    restart: (whileStopped: () => Promise<void>) => Promise<void>,
  ): Promise<void> {
    const address = this.address ?? noAddress();
    this.close();

    await restart(async (): Promise<void> => {
      expect(await accepts('127.0.0.1', this.port)).toBe(false);
      expect(await accepts(address, this.port)).toBe(false);
    });
  }

  // Closes what the owner opened; safe to call twice.
  close(): void {
    this.asking?.stop();
    this.owner.close();
  }

  // The owner's side of the pair sheet, in the shape the channel client answers a Device through: the Server's key as the QR carried it, and the owner's Allow.
  private hostFor(serverKey: string, asking: Asking): ChannelTestHost {
    const { client } = this.owner;

    return {
      url: this.httpUrl,
      caller: {
        devices: { serverKey: async () => ({ publicKey: serverKey }) },
        pairing: {
          registered: async () => onlyOne(asking.first),
          allow: (input) => client.pairing.allow.mutate(input),
          decline: (input) => client.pairing.decline.mutate(input),
        },
      },
    };
  }
}

const noAddress = (): never => {
  throw new Error('Local network access is not on yet');
};

const noDevice = (): never => {
  throw new Error('The second App has not paired yet');
};
