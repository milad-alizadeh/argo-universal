import {
  readQueuedJobs,
  type WriterActorRef,
  type WriterJob,
} from '../storage';
import { FeedRowsJob } from './feed-rows-job';

const unstoredMessage =
  'The Writer stopped before storing the Operation result';

const holds = (jobs: readonly WriterJob[], blobId: string): boolean =>
  jobs.some((job) => job instanceof FeedRowsJob && job.holdsBlob(blobId));

const awaitsReceipt = (
  writer: WriterActorRef | undefined,
  blobId: string,
): writer is WriterActorRef =>
  writer !== undefined && holds(readQueuedJobs(writer), blobId);

// Resolves at the Writer receipt of the job that stores this output Blob, or at once when no queued job holds it (ADR-0002).
export async function outputBlobStored(
  writer: WriterActorRef | undefined,
  blobId: string,
  signal?: AbortSignal,
): Promise<void> {
  if (!awaitsReceipt(writer, blobId)) return;

  const receipt = Promise.withResolvers<void>();
  const watch = new BlobReceipt({ writer, blobId, signal }, receipt);
  watch.start();
  await receipt.promise;
}

type ReceiptInput = {
  writer: WriterActorRef;
  blobId: string;
  signal?: AbortSignal;
};

type Settle = Pick<PromiseWithResolvers<void>, 'resolve' | 'reject'>;

// Follows the Writer until the job holding the Blob commits, the Writer stops, or the caller leaves.
class BlobReceipt {
  private readonly endings: (() => void)[] = [];
  public constructor(
    private readonly input: ReceiptInput,
    private readonly settle: Settle,
  ) {}
  public start(): void {
    const { writer, blobId } = this.input;

    const committed = writer.on('writer.committed', ({ jobs }) => {
      if (holds(jobs, blobId)) this.end(() => this.settle.resolve());
    });

    const stopped = writer.subscribe({ complete: this.stopped });
    this.endings.push(
      () => committed.unsubscribe(),
      () => stopped.unsubscribe(),
    );
    this.followSignal();
  }
  private followSignal(): void {
    const { signal } = this.input;

    if (!signal) return;
    const abort = (): void => this.end(() => this.settle.reject(signal.reason));

    if (signal.aborted) return abort();
    signal.addEventListener('abort', abort, { once: true });
    this.endings.push(() => signal.removeEventListener('abort', abort));
  }
  private readonly stopped = (): void =>
    this.end(() => this.settle.reject(new Error(unstoredMessage)));
  private end(settle: () => void): void {
    for (const ending of this.endings.splice(0)) ending();
    settle();
  }
}
