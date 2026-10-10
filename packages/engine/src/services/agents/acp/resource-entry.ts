import { createRejectionCounter } from '../../../lib/count-rejections';
import {
  closeProtocolReservation,
  releaseOpening,
  reserveOpening,
  watchWithdrawal,
  type AcpReservation,
} from './reservations';
import { AcpResourceCleanup } from './resource-cleanup';
import { AcpResourceConnection } from './resource-connection';
import type {
  AcpOpenInput,
  AcpResourceInput,
  AcpSessionLease,
  AgentLaunch,
} from './resource-types';
import { AcpRouting } from './routing';

const reservationLimit = 64;
export class AcpResourceEntry {
  private readonly rejections = createRejectionCounter('ACP resources');
  private readonly reservations = new Set<AcpReservation>();
  private readonly routing = new AcpRouting(this.rejections, (error) =>
    this.cleanup.fail(error),
  );
  private readonly connection: AcpResourceConnection;
  private readonly cleanup: AcpResourceCleanup;
  public constructor(
    private readonly input: AcpResourceInput,
    launch: AgentLaunch,
  ) {
    this.connection = new AcpResourceConnection(input, this.routing, launch);
    this.cleanup = new AcpResourceCleanup({
      connection: this.connection,
      routing: this.routing,
      reservations: this.reservations,
    });
    this.connection.observeResourceFailures((error) =>
      this.cleanup.fail(error),
    );
  }
  public closed(): Promise<void> {
    return this.cleanup.closed();
  }
  public async open(input: AcpOpenInput): Promise<AcpSessionLease> {
    this.requireAvailable();
    const reservation = this.reserve(input);
    try {
      return await this.completeOpening(reservation);
    } catch (error) {
      await this.cleanup.abandon(reservation, error);
      throw error;
    }
  }
  private requireAvailable(): void {
    if (this.cleanup.retired || this.reservations.size >= reservationLimit)
      throw new Error('ACP resource is unavailable');
  }
  private reserve(input: AcpOpenInput): AcpReservation {
    const reservation = reserveOpening(input);
    this.routing.reserve(reservation);
    this.reservations.add(reservation);
    watchWithdrawal(
      reservation,
      () => this.withdraw(reservation),
      (error) => this.cleanup.retire(reservation, error),
    );
    return reservation;
  }
  private async completeOpening(
    reservation: AcpReservation,
  ): Promise<AcpSessionLease> {
    const opened = await this.connection.open(reservation.input.opening, () => {
      if (reservation.withdrawn)
        throw new DOMException('ACP opening was withdrawn', 'AbortError');
      reservation.dispatched = true;
      this.routing.markOpeningEligibleForUpdates(reservation);
    });
    if (reservation.sessionId === undefined)
      this.routing.bindSessionDestination(reservation, opened.sessionId);
    return this.handover(reservation, opened);
  }
  private async handover(
    reservation: AcpReservation,
    opened: Omit<AcpSessionLease, 'close' | 'released'>,
  ): Promise<AcpSessionLease> {
    reservation.stopWithdrawal();
    if (this.cleanup.retired) reservation.withdrawn = true;
    const close = (): Promise<void> => this.close(reservation);
    if (reservation.withdrawn) {
      await close();
      throw new DOMException('ACP opening was withdrawn', 'AbortError');
    }
    return { ...opened, close, released: reservation.released.promise };
  }
  private async withdraw(reservation: AcpReservation): Promise<void> {
    reservation.withdrawn = true;
    await this.cleanup.releaseIfIdle();
  }
  private close(reservation: AcpReservation): Promise<void> {
    reservation.closing ??= this.closeOwned(reservation);
    return reservation.closing;
  }
  private async closeOwned(reservation: AcpReservation): Promise<void> {
    if (!this.reservations.has(reservation)) return;
    try {
      await this.proveLocalClose(reservation);
    } catch (error) {
      this.cleanup.retainClose(reservation, error);
      throw error;
    }
    releaseOpening(reservation, this.reservations, this.routing);
    await this.cleanup.releaseIfIdle();
    reservation.released.resolve();
  }
  private async proveLocalClose(reservation: AcpReservation): Promise<void> {
    await closeProtocolReservation({
      connection: this.connection,
      reservation,
      timeoutMs: this.input.closeTimeoutMs,
    });
    this.cleanup.requireLocalProof();
  }
  public shutdown(): Promise<void> {
    return this.cleanup.shutdown();
  }
}
