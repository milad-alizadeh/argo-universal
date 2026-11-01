// The part of a channel the Server needs to end it.
export interface ClosableChannel {
  destroy(): void;
  once(event: 'close', listener: () => void): void;
}

/*
 * The channels each Paired Device has open right now, so unpairing a Device can end them at once, mid-Session, rather than on its next connect (ADR-0045).
 * The Server Device's own App is not here: it arrives on loopback and is not a Paired Device, so it cannot be unpaired.
 */
export class OpenChannels {
  private readonly byDevice = new Map<string, Set<ClosableChannel>>();

  public track(deviceId: string, channel: ClosableChannel): void {
    const open = this.byDevice.get(deviceId) ?? new Set<ClosableChannel>();

    open.add(channel);
    this.byDevice.set(deviceId, open);
    channel.once('close', () => this.forget(deviceId, channel));
  }

  public closeAll(deviceId: string): void {
    for (const channel of this.byDevice.get(deviceId) ?? []) channel.destroy();

    this.byDevice.delete(deviceId);
  }

  private forget(deviceId: string, channel: ClosableChannel): void {
    const open = this.byDevice.get(deviceId) ?? new Set<ClosableChannel>();

    open.delete(channel);

    if (open.size === 0) this.byDevice.delete(deviceId);
  }
}
