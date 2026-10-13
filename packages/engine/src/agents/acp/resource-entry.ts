import { createRejectionCounter } from '@repo/machine-log';
import type { AgentLaunch } from '..';
import {
  closeProtocolReservation,
  releaseOpening,
  type AcpReservation,
} from './reservations';
import { AcpResourceCleanup } from './resource-cleanup';
import { AcpResourceConnection } from './resource-connection';
import {
  awaitCheckoutRelease,
  handoverOwnedLease,
  prepareLeaseReplacement,
  reserveOwnedOpening,
} from './resource-replacement';
import type {
  AcpOpenInput,
  AcpResourceInput,
  AcpSessionLease,
} from './resource-types';
import { AcpRouting } from './routing';

const reservationLimit = 64;
type RetireFailedGeneration = (checkouts: readonly string[]) => void;
type ConfirmCheckoutRelease = () => Promise<void>;
export class AcpResourceEntry {
  private readonly rejections = createRejectionCounter('ACP resources');
  private readonly reservations = new Set<AcpReservation>();
  private readonly routing = new AcpRouting(this.rejections, (error) =>
    this.failGeneration(error),
  );
  private readonly connection: AcpResourceConnection;
  private readonly cleanup: AcpResourceCleanup;
  public constructor(
    private readonly input: AcpResourceInput,
    launch: AgentLaunch,
    private readonly retireFailedGeneration: RetireFailedGeneration,
  ) {
    this.connection = new AcpResourceConnection(input, this.routing, launch);
    this.cleanup = new AcpResourceCleanup({
      connection: this.connection,
      routing: this.routing,
      reservations: this.reservations,
    });
    this.connection.observeResourceFailures((error) =>
      this.failGeneration(error),
    );
  }
  public closed(): Promise<void> {
    return this.cleanup.closed();
  }
  private failGeneration(error: unknown): void {
    const checkouts = [...this.reservations].map(
      (reservation) => reservation.input.opening.params.cwd,
    );
    if (!this.cleanup.fail(error)) return;
    this.retireFailedGeneration(checkouts);
    void this.cleanup.shutdown().catch(() => {});
  }
  public async open(
    input: AcpOpenInput,
    confirmCheckoutRelease: ConfirmCheckoutRelease,
  ): Promise<AcpSessionLease> {
    this.requireAvailable();
    const reservation = this.reserve(input);
    try {
      await awaitCheckoutRelease(reservation, confirmCheckoutRelease);
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
    return reserveOwnedOpening(input, {
      reservations: this.reservations,
      routing: this.routing,
      cleanup: this.cleanup,
    });
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
  private handover(
    reservation: AcpReservation,
    opened: Omit<AcpSessionLease, 'close' | 'replace' | 'released'>,
  ): Promise<AcpSessionLease> {
    return handoverOwnedLease({
      opened,
      reservation,
      cleanup: this.cleanup,
      close: () => this.close(reservation),
      replace: (input) => this.replace(reservation, input),
    });
  }
  private replace(
    previous: AcpReservation,
    input: Omit<AcpOpenInput, 'launch'>,
  ): Promise<AcpSessionLease> {
    return prepareLeaseReplacement(previous, input, {
      reservations: this.reservations,
      routing: this.routing,
      cleanup: this.cleanup,
      close: (reservation) => this.close(reservation),
      open: (reservation) => this.completeOpening(reservation),
    });
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
