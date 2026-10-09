import {
  settleReservationAfterExit,
  releaseOpening,
  type AcpReservation,
} from './reservations';
import type { AcpResourceConnection } from './resource-connection';
import type { AcpRouting } from './routing';

type CleanupInput = {
  connection: AcpResourceConnection;
  routing: AcpRouting;
  reservations: Set<AcpReservation>;
};
export class AcpResourceCleanup {
  public retired = false;
  private broken = false;
  private termination: Promise<void> | undefined;
  private readonly released = Promise.withResolvers<void>();
  public constructor(private readonly input: CleanupInput) {}
  public closed(): Promise<void> {
    return this.released.promise;
  }
  public retire(reservation: AcpReservation, error: unknown): void {
    this.retired = true;
    reservation.input.destination.failed(error);
  }
  public retainClose(reservation: AcpReservation, error: unknown): void {
    reservation.withdrawn = true;
    this.retire(reservation, error);
    void this.releaseIfIdle().catch((failure: unknown) =>
      reservation.input.destination.failed(failure),
    );
  }
  public fail(error: unknown): void {
    if (this.hasFailedOrStartedTermination()) return;
    this.broken = true;
    this.retired = true;
    this.input.routing.fence();
    for (const reservation of this.input.reservations)
      reservation.input.destination.failed(error);
  }
  private hasFailedOrStartedTermination(): boolean {
    return this.termination !== undefined || this.broken;
  }
  public requireLocalProof(): void {
    if (this.broken)
      throw new Error('ACP resource failure requires observed process exit');
  }
  public async releaseIfIdle(): Promise<void> {
    if ([...this.input.reservations].every((owner) => owner.withdrawn))
      await this.shutdown();
  }
  public async abandon(
    reservation: AcpReservation,
    error: unknown,
  ): Promise<void> {
    if (!this.input.reservations.has(reservation)) return;
    if (this.canReleaseUndispatched(reservation))
      return this.releaseUndispatched(reservation);
    reservation.withdrawn = true;
    this.retire(reservation, error);
    await this.releaseIfIdle().catch((failure: unknown) =>
      this.retire(reservation, failure),
    );
    await reservation.released.promise;
  }
  private canReleaseUndispatched(reservation: AcpReservation): boolean {
    return reservation.withdrawn && !reservation.dispatched;
  }
  private async releaseUndispatched(
    reservation: AcpReservation,
  ): Promise<void> {
    releaseOpening(reservation, this.input.reservations, this.input.routing);
    await this.releaseIfIdle();
    reservation.released.resolve();
  }
  public shutdown(): Promise<void> {
    this.termination ??= this.terminate();
    return this.termination;
  }
  private async terminate(): Promise<void> {
    this.retired = true;
    await this.input.connection.shutdown();
    await Promise.all(
      [...this.input.reservations].map(settleReservationAfterExit),
    );
    for (const reservation of this.input.reservations) {
      releaseOpening(reservation, this.input.reservations, this.input.routing);
      reservation.released.resolve();
    }
    this.input.routing.fence();
    this.released.resolve();
  }
}
