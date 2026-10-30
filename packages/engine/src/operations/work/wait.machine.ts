import { TRPCError } from '@trpc/server';
import { assign, fromCallback, fromPromise, raise, setup } from 'xstate';
import type { SessionWorkWatcher } from '../../sessions';
import type { OperationRunResult } from '../implementations';
import { admissionTimedOut, operationWaitLimitMs } from './clock';
import type { WaitId } from './ids';
import type { WorkObservation } from './observation';
import { onDisconnect, watchWork, type WatchInput } from './watching';

// What admission answers: a result to return as it is, or the wait id of the work it started.
export type Admitted =
  | { kind: 'answer'; answer: OperationRunResult }
  | { kind: 'observe'; id: WaitId };

// A user's admission runs under the wait's deadline, which aborts its signal and answers with what it last offered.
export type WorkAdmission = {
  signal: AbortSignal;
  started: (expired: () => OperationRunResult) => void;
};

// Reads and watches the work behind one wait id; each read authorizes its caller again.
export type WorkReader = {
  read: () => WorkObservation;
  watch: SessionWorkWatcher;
};

type Admit = (admission: WorkAdmission) => Promise<Admitted>;

// A wait admits its Operation first, or reads work that already has a wait id at once.
export type WaitStart =
  | { kind: 'admit'; admit: Admit }
  | { kind: 'observe'; id: WaitId };

export type WaitInput = {
  start: WaitStart;
  reader: (id: WaitId) => WorkReader;
  // Also stop once a Tool call reaches its native work or waits for the user.
  stopOnInput: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
};

export type WaitOutcome =
  | { kind: 'answer'; answer: OperationRunResult }
  | { kind: 'observation'; observation: WorkObservation }
  | { kind: 'failure'; failure: unknown };

type WaitContext = WaitInput & {
  expired?: () => OperationRunResult;
  work?: WorkReader;
  watched?: string;
  // The latest read while observing; final once the wait is done.
  outcome?: WaitOutcome;
};

type WaitEvent =
  | { type: 'admission.started'; expired: () => OperationRunResult }
  | { type: 'work.changed' }
  | { type: 'work.failed'; cause: unknown }
  | { type: 'wait.disconnected' }
  | { type: 'wait.expired' };

type AdmitInput = { admit: Admit } & Pick<WorkAdmission, 'started'>;

const done = '#operationWait.done';

// Waits at most ninety seconds across admission and observation; leaving it never stops the native work (ADR-0003, ADR-0044).
export const operationWaitMachine = setup({
  // SAFETY: XState reads these declarations only as types, never runtime input.
  types: {
    input: {} as WaitInput,
    context: {} as WaitContext,
    events: {} as WaitEvent,
    output: {} as WaitOutcome,
  },
  actors: {
    admit: fromPromise<Admitted, AdmitInput>(({ input, signal }) =>
      input.admit({ signal, started: input.started }),
    ),
    watch: fromCallback<WaitEvent, WatchInput>(({ input, sendBack }) =>
      watchWork(input, sendBack),
    ),
    disconnection: fromCallback<WaitEvent, AbortSignal | undefined>(
      ({ input, sendBack }) =>
        onDisconnect(input, () => sendBack({ type: 'wait.disconnected' })),
    ),
  },
  delays: {
    waitLimit: ({ context }) => context.timeoutMs ?? operationWaitLimitMs,
  },
  actions: {
    expire: raise({ type: 'wait.expired' }),
    rememberExpiry: assign(
      (_, expired: () => OperationRunResult): Pick<WaitContext, 'expired'> => ({
        expired,
      }),
    ),
    follow: assign(({ context }): Pick<WaitContext, 'work'> => ({
      work: followedReader(context),
    })),
    admitted: assign(({ context }, admitted: Admitted): Partial<WaitContext> =>
      admitted.kind === 'observe'
        ? { work: context.reader(admitted.id) }
        : { outcome: admitted },
    ),
    expireAdmission: assign(({ context }): Pick<WaitContext, 'outcome'> => ({
      outcome: settle(context.expired ?? admissionTimedOut),
    })),
    read: assign(({ context }): Pick<WaitContext, 'outcome'> => ({
      outcome: readWork(context.work),
    })),
    rememberWatched: assign(({ context }): Pick<WaitContext, 'watched'> => ({
      watched: watchedSession(context.outcome),
    })),
    fail: assign(
      (_, { cause }: { cause: unknown }): Pick<WaitContext, 'outcome'> => ({
        outcome: { kind: 'failure', failure: cause },
      }),
    ),
    detach: assign((): Pick<WaitContext, 'outcome'> => ({
      outcome: { kind: 'failure', failure: disconnected() },
    })),
  },
  guards: {
    observes: (_, admitted: Admitted): boolean => admitted.kind === 'observe',
    following: ({ context }): boolean => context.start.kind === 'observe',
    concluded: ({ context }): boolean => concluded(context),
    moved: ({ context }): boolean =>
      watchedSession(context.outcome) !== context.watched,
  },
}).createMachine({
  id: 'operationWait',
  context: ({ input }): WaitContext => ({ ...input }),
  initial: 'waiting',
  states: {
    waiting: {
      after: { waitLimit: { actions: 'expire' } },
      initial: 'starting',
      states: {
        starting: {
          always: [
            { guard: 'following', target: 'observing', actions: 'follow' },
            { target: 'admitting' },
          ],
        },
        admitting: {
          invoke: {
            src: 'admit',
            input: ({ context, self }): AdmitInput => ({
              admit: admission(context.start),
              started: (expired): void => {
                if (self.getSnapshot().status === 'active')
                  self.send({ type: 'admission.started', expired });
              },
            }),
            onDone: [
              {
                guard: {
                  type: 'observes',
                  params: ({ event }): Admitted => event.output,
                },
                target: 'observing',
                actions: {
                  type: 'admitted',
                  params: ({ event }): Admitted => event.output,
                },
              },
              {
                target: done,
                actions: {
                  type: 'admitted',
                  params: ({ event }): Admitted => event.output,
                },
              },
            ],
            onError: {
              target: done,
              actions: {
                type: 'fail',
                params: ({ event }) => ({ cause: event.error }),
              },
            },
          },
          on: {
            'admission.started': {
              actions: {
                type: 'rememberExpiry',
                params: ({ event }) => event.expired,
              },
            },
            'wait.expired': {
              target: done,
              actions: 'expireAdmission',
            },
          },
        },
        observing: {
          entry: 'read',
          invoke: {
            src: 'disconnection',
            input: ({ context }) => context.signal,
          },
          initial: 'checking',
          states: {
            checking: {
              always: [
                { guard: 'concluded', target: done },
                { target: 'watching' },
              ],
            },
            watching: {
              entry: 'rememberWatched',
              invoke: {
                src: 'watch',
                input: ({ context }) => watchInput(context),
              },
              always: [
                { guard: 'concluded', target: done },
                { guard: 'moved', target: 'watching', reenter: true },
              ],
            },
          },
          on: {
            'work.changed': { actions: 'read' },
            'work.failed': {
              target: done,
              actions: {
                type: 'fail',
                params: ({ event }) => ({ cause: event.cause }),
              },
            },
            'wait.disconnected': {
              target: done,
              actions: 'detach',
            },
            'wait.expired': { target: done, actions: 'read' },
          },
        },
      },
    },
    done: { type: 'final' },
  },
  output: ({ context }): WaitOutcome =>
    context.outcome ?? { kind: 'failure', failure: unfinished() },
});

function followedReader({
  start,
  reader,
}: WaitContext): WorkReader | undefined {
  return start.kind === 'observe' ? reader(start.id) : undefined;
}

// Work that already has a wait id is followed from `starting`, so it never waits for an admission.
function admission(start: WaitStart): Admit {
  return start.kind === 'admit'
    ? start.admit
    : async (): Promise<Admitted> => start;
}

function settle(answer: () => OperationRunResult): WaitOutcome {
  try {
    return { kind: 'answer', answer: answer() };
  } catch (failure) {
    return { kind: 'failure', failure };
  }
}

function readWork(work: WorkReader | undefined): WaitOutcome {
  try {
    return { kind: 'observation', observation: requireReader(work).read() };
  } catch (failure) {
    return { kind: 'failure', failure };
  }
}

function requireReader(work: WorkReader | undefined): WorkReader {
  if (work) return work;
  throw unfinished();
}

function watchInput({ work, outcome }: WaitContext): WatchInput {
  const sessionId = watchedSession(outcome);

  if (sessionId === undefined) throw unfinished();

  return { watch: requireReader(work).watch, sessionId };
}

function watchedSession(outcome: WaitOutcome | undefined): string | undefined {
  return outcome?.kind === 'observation'
    ? outcome.observation.work.sessionId
    : undefined;
}

// A failed read ends the wait; a read ends it once settled, or at native work when it stops there.
function concluded({ outcome, stopOnInput }: WaitContext): boolean {
  if (!outcome) return false;

  return outcome.kind === 'observation'
    ? answers(outcome.observation, stopOnInput)
    : true;
}

function answers(
  { execution, work }: WorkObservation,
  stopOnInput: boolean,
): boolean {
  if (execution.status === 'settled') return true;

  return stopOnInput && atNativeInput({ execution, work });
}

// A Tool call stops once it reaches native work, or once it waits for the user.
function atNativeInput({ execution, work }: WorkObservation): boolean {
  return work.kind !== 'call' || execution.status === 'waiting_for_user';
}

function disconnected(): TRPCError {
  return new TRPCError({
    code: 'CLIENT_CLOSED_REQUEST',
    message: 'The wait was disconnected',
  });
}

function unfinished(): Error {
  return new Error('The Operation wait ended before it read its work');
}
