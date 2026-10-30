import { assign, fromCallback, setup, type Subscription } from 'xstate';
import type { WriterActorRef, WriterJob } from '../storage';

type ReceiptInput = {
  writer: WriterActorRef;
  blobId: string;
  signal?: AbortSignal;
};

// The Blob's job committed, or the wait ended without it: the Writer stopped, or the caller left.
type ReceiptOutcome = { kind: 'stored' } | { kind: 'unstored'; cause: unknown };

type ReceiptEvent =
  | { type: 'receipt.committed' }
  | { type: 'receipt.ended'; cause: unknown };

type ReceiptContext = ReceiptInput & { outcome?: ReceiptOutcome };

const unstoredMessage =
  'The Writer stopped before storing the Operation result';

// The role of a job that stores Blobs; a job of any module takes it by having the member.
export interface BlobHoldingJob {
  holdsBlob: (blobId: string) => boolean;
}

const storesBlobs = (job: WriterJob): job is WriterJob & BlobHoldingJob =>
  'holdsBlob' in job;

export const holdsBlob = (
  jobs: readonly WriterJob[],
  blobId: string,
): boolean => jobs.filter(storesBlobs).some((job) => job.holdsBlob(blobId));

// Follows the Writer until the job holding the Blob commits, the Writer stops, or the caller leaves (ADR-0002, ADR-0003).
export const blobReceiptMachine = setup({
  // SAFETY: XState reads these declarations only as types, never runtime input.
  types: {
    input: {} as ReceiptInput,
    context: {} as ReceiptContext,
    events: {} as ReceiptEvent,
    output: {} as ReceiptOutcome,
  },
  actors: {
    writer: fromCallback<ReceiptEvent, ReceiptInput>(({ input, sendBack }) =>
      followWriter(input, sendBack),
    ),
    caller: fromCallback<ReceiptEvent, AbortSignal | undefined>(
      ({ input, sendBack }) => followCaller(input, sendBack),
    ),
  },
  actions: {
    store: assign((): Pick<ReceiptContext, 'outcome'> => ({
      outcome: { kind: 'stored' },
    })),
    end: assign(
      (_, { cause }: { cause: unknown }): Pick<ReceiptContext, 'outcome'> => ({
        outcome: { kind: 'unstored', cause },
      }),
    ),
  },
}).createMachine({
  id: 'blobReceipt',
  context: ({ input }): ReceiptContext => ({ ...input }),
  initial: 'waiting',
  states: {
    waiting: {
      invoke: [
        { src: 'writer', input: ({ context }): ReceiptInput => context },
        {
          src: 'caller',
          input: ({ context }): AbortSignal | undefined => context.signal,
        },
      ],
      on: {
        'receipt.committed': { target: 'done', actions: 'store' },
        'receipt.ended': {
          target: 'done',
          actions: {
            type: 'end',
            params: ({ event }) => ({ cause: event.cause }),
          },
        },
      },
    },
    done: { type: 'final' },
  },
  output: ({ context }): ReceiptOutcome =>
    context.outcome ?? { kind: 'unstored', cause: new Error(unstoredMessage) },
});

type SendBack = (event: ReceiptEvent) => void;

function followWriter(
  { writer, blobId }: ReceiptInput,
  sendBack: SendBack,
): () => void {
  const committed = writer.on('writer.committed', ({ jobs }) => {
    if (holdsBlob(jobs, blobId)) sendBack({ type: 'receipt.committed' });
  });

  const stopped = followWriterStop(writer, sendBack);

  return (): void => {
    committed.unsubscribe();
    stopped.unsubscribe();
  };
}

const followWriterStop = (
  writer: WriterActorRef,
  sendBack: SendBack,
): Subscription =>
  writer.subscribe({
    complete: () =>
      sendBack({ type: 'receipt.ended', cause: new Error(unstoredMessage) }),
  });

function followCaller(
  signal: AbortSignal | undefined,
  sendBack: SendBack,
): () => void {
  if (!signal) return (): void => {};

  const left = (): void =>
    sendBack({ type: 'receipt.ended', cause: signal.reason });

  if (signal.aborted) left();
  else signal.addEventListener('abort', left, { once: true });

  return (): void => signal.removeEventListener('abort', left);
}
