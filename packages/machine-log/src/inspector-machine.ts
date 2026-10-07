import { createInspector } from '@statelyai/inspect';
import WebSocket from 'ws';
import {
  assign,
  fromCallback,
  type InspectionEvent,
  sendTo,
  setup,
} from 'xstate';
import {
  cleanInspection,
  cleanMachineContext,
  inspectorOptions,
} from './index';

interface InspectorInput {
  port: number;
  processName: string;
  processId: number;
}
type InspectorEvent =
  | { type: 'inspection.record'; inspection: InspectionEvent }
  | { type: 'inspection.stop' }
  | { type: 'transport.opened' }
  | { type: 'transport.failed' };
export type TransportEvent = {
  type: 'inspection.send';
  inspections: InspectionEvent[];
};
export interface TransportInput extends InspectorInput {
  parent: { send(event: InspectorEvent): void };
}

const maxConnectionAttempts = 20;
const maxWaitingInspections = 200;

export const inspectorMachine = setup({
  types: {
    input: {} as InspectorInput,
    context: {} as InspectorInput & {
      attempts: number;
      waiting: InspectionEvent[];
    },
    events: {} as InspectorEvent,
  },
  actors: {
    transport: fromCallback<TransportEvent, TransportInput>(
      ({ input, receive }) => {
        const socket = new WebSocket(`ws://127.0.0.1:${input.port}`);
        const prefix = `${input.processName}:${input.processId}:`;
        const qualify = (id: string) =>
          id.startsWith(prefix) ? id : `${prefix}${id}`;
        const inspector = createInspector(
          {
            send: (event) => {
              if (socket.readyState === WebSocket.OPEN)
                socket.send(JSON.stringify(cleanMachineContext(event)));
            },
          },
          {
            ...inspectorOptions,
            serialize: (event) => {
              const serialized = {
                ...event,
                sessionId: qualify(event.sessionId),
              };
              if (serialized.rootId !== undefined)
                serialized.rootId = qualify(serialized.rootId);
              if (
                serialized.type === '@xstate.actor' &&
                serialized.parentId !== undefined
              )
                serialized.parentId = qualify(serialized.parentId);
              if (
                serialized.type === '@xstate.event' &&
                serialized.sourceId !== undefined
              )
                serialized.sourceId = qualify(serialized.sourceId);
              return serialized;
            },
          },
        );
        const opened = () => input.parent.send({ type: 'transport.opened' });
        const failed = () => input.parent.send({ type: 'transport.failed' });
        socket.on('open', opened);
        socket.on('error', failed);
        socket.on('close', failed);
        receive(({ inspections }) => {
          for (const inspection of inspections)
            inspector.inspect.next?.(cleanInspection(inspection));
        });
        return () => {
          socket.off('open', opened);
          socket.off('error', failed);
          socket.off('close', failed);
          socket.on('error', () => {});
          socket.terminate();
        };
      },
    ),
  },
  delays: { connectionLimit: 1000, retryDelay: 500 },
  guards: {
    retryAvailable: ({ context }) => context.attempts < maxConnectionAttempts,
  },
  actions: {
    countAttempt: assign({ attempts: ({ context }) => context.attempts + 1 }),
    rememberInspection: assign({
      waiting: ({ context, event }) =>
        event.type === 'inspection.record'
          ? [...context.waiting, event.inspection].slice(-maxWaitingInspections)
          : context.waiting,
    }),
    clearWaiting: assign({ waiting: [] }),
    flushWaiting: sendTo('transport', ({ context }) => ({
      type: 'inspection.send',
      inspections: context.waiting,
    })),
    sendInspection: sendTo('transport', ({ event }) => ({
      type: 'inspection.send',
      inspections: event.type === 'inspection.record' ? [event.inspection] : [],
    })),
    reportUnavailable: () =>
      console.warn(
        'Machine Inspector is unavailable; start pnpm inspect and restart the processes. JSONL logging continues.',
      ),
  },
}).createMachine({
  id: 'machineInspector',
  context: ({ input }) => ({ ...input, attempts: 0, waiting: [] }),
  initial: 'active',
  on: {
    'inspection.record': { actions: 'rememberInspection' },
    'inspection.stop': { target: '.stopped' },
  },
  states: {
    active: {
      entry: 'countAttempt',
      invoke: {
        id: 'transport',
        src: 'transport',
        input: ({ context, self }) => ({ ...context, parent: self }),
      },
      initial: 'connecting',
      on: { 'transport.failed': { target: 'backingOff' } },
      states: {
        connecting: {
          after: {
            connectionLimit: { target: '#machineInspector.backingOff' },
          },
          on: { 'transport.opened': { target: 'connected' } },
        },
        connected: {
          entry: ['flushWaiting', 'clearWaiting'],
          on: { 'inspection.record': { actions: 'sendInspection' } },
        },
      },
    },
    backingOff: {
      after: {
        retryDelay: [
          { guard: 'retryAvailable', target: 'active' },
          { target: 'unavailable' },
        ],
      },
    },
    unavailable: { entry: 'reportUnavailable', type: 'final' },
    stopped: { type: 'final' },
  },
});
