import type { SessionNotification } from '@agentclientprotocol/sdk';
import type { createRejectionCounter } from '@repo/machine-log';
import type { AcpReservation } from './reservations';

const earlyUpdateLimit = 64;
const earlyByteLimit = 262_144;
type EarlyUpdate = {
  notification: SessionNotification;
  eligible: Set<AcpReservation>;
  bytes: number;
};

export class AcpRouting {
  private readonly destinations = new Map<string, AcpReservation>();
  private readonly openings = new Set<AcpReservation>();
  private buffered: EarlyUpdate[] = [];
  private bytes = 0;
  private fenced = false;
  public constructor(
    private readonly rejections: ReturnType<typeof createRejectionCounter>,
    private readonly failed: (error: unknown) => void,
  ) {}

  public reserve(reservation: AcpReservation): void {
    if (reservation.sessionId !== undefined)
      this.bindSessionDestination(reservation, reservation.sessionId);
  }
  public markOpeningEligibleForUpdates(reservation: AcpReservation): void {
    if (reservation.sessionId === undefined) this.openings.add(reservation);
  }
  public findSessionReservation = (
    sessionId: string | undefined,
  ): AcpReservation | undefined => {
    const destination = this.locateSessionReservation(sessionId);
    if (!destination)
      this.rejections.report('Unknown or unavailable ACP session destination');
    return destination;
  };
  private locateSessionReservation(
    sessionId: string | undefined,
  ): AcpReservation | undefined {
    return this.fenced || sessionId === undefined
      ? undefined
      : this.destinations.get(sessionId);
  }
  public accept = (notification: SessionNotification): undefined => {
    if (this.fenced) return undefined;
    const destination = this.destinations.get(notification.sessionId);
    if (destination) this.deliver(destination, notification);
    else this.buffer(notification);
    return undefined;
  };
  public bindSessionDestination(
    reservation: AcpReservation,
    sessionId: string,
  ): void {
    if (this.destinations.has(sessionId))
      throw new Error('ACP session identity is already owned');
    reservation.sessionId = sessionId;
    this.destinations.set(sessionId, reservation);
    this.deliverReservedEarlyUpdates(reservation);
    this.openings.delete(reservation);
    this.rejectUnclaimableEarlyUpdates();
  }
  public release(reservation: AcpReservation): void {
    if (reservation.sessionId !== undefined)
      this.destinations.delete(reservation.sessionId);
    this.openings.delete(reservation);
    this.rejectUnclaimableEarlyUpdates();
  }
  public fence(): void {
    this.fenced = true;
    this.buffered = [];
    this.bytes = 0;
  }
  private deliver(
    reservation: AcpReservation,
    notification: SessionNotification,
  ): void {
    if (!reservation.withdrawn)
      reservation.input.destination.update(notification);
  }
  private buffer(notification: SessionNotification): void {
    if (this.openings.size === 0) {
      this.rejections.report('Unrecognised ACP session update');
      return;
    }
    const bytes = Buffer.byteLength(JSON.stringify(notification));
    if (this.isFull(bytes)) return this.overflow();
    this.buffered.push({
      notification,
      eligible: new Set(this.openings),
      bytes,
    });
    this.bytes += bytes;
  }
  private isFull(bytes: number): boolean {
    return (
      this.buffered.length >= earlyUpdateLimit ||
      this.bytes + bytes > earlyByteLimit
    );
  }
  private overflow(): void {
    const error = new Error('ACP early update buffer limit reached');
    this.rejections.report(error.message);
    this.fence();
    this.failed(error);
  }
  private deliverReservedEarlyUpdates(reservation: AcpReservation): void {
    const reservedUpdates = this.buffered.filter(
      (row) =>
        row.notification.sessionId === reservation.sessionId &&
        row.eligible.has(reservation),
    );
    for (const row of reservedUpdates)
      this.deliver(reservation, row.notification);
    this.remove(new Set(reservedUpdates));
  }
  private rejectUnclaimableEarlyUpdates(): void {
    const unclaimableUpdates = this.buffered.filter(
      (row) =>
        ![...row.eligible].some((reservation) =>
          this.openings.has(reservation),
        ),
    );
    for (const row of unclaimableUpdates)
      this.rejections.report(
        `Unclaimed ACP early session update (${row.bytes} bytes)`,
      );
    this.remove(new Set(unclaimableUpdates));
  }
  private remove(rows: Set<EarlyUpdate>): void {
    this.buffered = this.buffered.filter((row) => !rows.has(row));
    this.bytes = this.buffered.reduce((sum, row) => sum + row.bytes, 0);
  }
}
