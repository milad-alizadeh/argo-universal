import { createActor, toPromise } from 'xstate';
import { readQueuedJobs, type WriterActorRef } from '../storage';
import { blobReceiptMachine, holdsBlob } from './blob-receipt.machine';

const awaitsReceipt = (
  writer: WriterActorRef | undefined,
  blobId: string,
): writer is WriterActorRef =>
  writer !== undefined && holdsBlob(readQueuedJobs(writer), blobId);

// Resolves at the Writer receipt of the job that stores this output Blob, or at once when no queued job holds it (ADR-0002).
export async function outputBlobStored(
  writer: WriterActorRef | undefined,
  blobId: string,
  signal?: AbortSignal,
): Promise<void> {
  if (!awaitsReceipt(writer, blobId)) return;

  const receipt = createActor(blobReceiptMachine, {
    input: { writer, blobId, signal },
  });

  const outcome = toPromise(receipt);
  receipt.start();
  const settled = await outcome;

  if (settled.kind === 'unstored') throw settled.cause;
}
