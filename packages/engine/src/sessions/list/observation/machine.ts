import {
  assertEvent,
  assign,
  enqueueActions,
  fromCallback,
  setup,
} from 'xstate';
import type { WriterActorRef } from '../../../storage';
import type { OpenSessionsActorRef } from '../../open-sessions-machine';
import type { WriterChange } from '../../writer-changes';
import type { SessionListState } from '../state';
import { refreshSessionList } from './cache';
import { SessionListSources } from './sources';

const listFailedEvent = 'list.failed';

export interface SessionListContext extends SessionListMachineInput {
  failure: unknown;
  rows: SessionListState | null;
  dirty: Set<string> | null;
}

export type { SessionListState } from '../state';

export interface SessionListMachineInput {
  sessions: OpenSessionsActorRef;
  writer: WriterActorRef | undefined;
  readRows: (sessionIds?: readonly string[]) => SessionListState;
  relatedSessionIds: (sessionIds: readonly string[]) => string[];
  sessionIdsForChanges: (change: WriterChange) => string[];
}

export type SessionListEvent =
  | { type: 'list.refresh'; sessionIds?: readonly string[] }
  | { type: 'list.flush' }
  | { type: 'list.failed'; error: unknown }
  | { type: 'list.stop' };

interface SessionListRowsEvent {
  type: 'list.rows';
  rows: SessionListState;
}

export const listRefreshDelay = 100;

export const sessionListMachine = setup({
  // SAFETY: XState v5 reads these as type-only declarations; the empty objects are never used as runtime values.
  types: {
    input: {} as SessionListMachineInput,
    context: {} as SessionListContext,
    events: {} as SessionListEvent,
    emitted: {} as SessionListRowsEvent,
  },
  actors: {
    observe: fromCallback<SessionListEvent, SessionListMachineInput>(
      ({ input, sendBack }): (() => void) =>
        new SessionListSources(input, sendBack).start(),
    ),
  },
  delays: { listRefreshDelay },
  actions: {
    rememberDirty: assign(
      ({ context, event }): Pick<SessionListContext, 'dirty'> => {
        assertEvent(event, 'list.refresh');

        return {
          dirty: mergeDirty(context.dirty, event.sessionIds),
        };
      },
    ),
    publishRows: enqueueActions(({ context, enqueue }): void => {
      try {
        const rows = refreshSessionList(context);
        enqueue.assign({ rows, dirty: new Set<string>() });
        enqueue.emit({ type: 'list.rows', rows });
      } catch (error) {
        enqueue.raise({ type: listFailedEvent, error });
      }
    }),
    rememberFailure: assign(
      ({ event }): Pick<SessionListContext, 'failure'> => {
        assertEvent(event, listFailedEvent);

        return { failure: event.error };
      },
    ),
  },
}).createMachine({
  id: 'sessionList',
  context: ({ input }): SessionListContext => ({
    ...input,
    failure: null,
    rows: null,
    dirty: null,
  }),
  initial: 'active',
  states: {
    active: {
      invoke: {
        src: 'observe',
        input: ({ context }): SessionListContext => context,
      },
      entry: 'publishRows',
      initial: 'idle',
      states: {
        idle: {
          on: {
            'list.refresh': { target: 'pending', actions: 'rememberDirty' },
          },
        },
        pending: {
          on: { 'list.refresh': { actions: 'rememberDirty' } },
          after: {
            listRefreshDelay: { target: 'idle', actions: 'publishRows' },
          },
        },
      },
      on: {
        'list.flush': { target: '.idle', actions: 'publishRows' },
        'list.failed': { target: 'failed', actions: 'rememberFailure' },
        'list.stop': { target: 'stopped' },
      },
    },
    failed: { type: 'final' },
    stopped: { type: 'final' },
  },
});

function mergeDirty(
  dirty: Set<string> | null,
  ids: readonly string[] | undefined,
): Set<string> | null {
  if (dirty === null) return null;

  return ids === undefined ? null : new Set([...dirty, ...ids]);
}
