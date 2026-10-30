import { firedDelay } from '@repo/vitest/model-test';
import { expect } from 'vitest';
import { getNextSnapshot, type EventFromLogic } from 'xstate';
import { sessionMachine } from '../src/sessions';
import type {
  AcpModelSnapshot,
  createAcpSessionModel,
} from './acp-session-model';

type SessionEvent = EventFromLogic<typeof sessionMachine>;

const nativeRequest = (
  turnId: string,
): Extract<SessionEvent, { type: 'session.permissionRequested' }> => ({
  type: 'session.permissionRequested',
  turnId,
  request: {
    requestId: 'native-model-request',
    toolCallId: 'model-tool',
    title: 'Model operation',
    options: [{ optionId: 'allow', name: 'Allow', kind: 'allow_once' }],
  },
});

const readyTurn = (state: AcpModelSnapshot): boolean =>
  state.matches({ open: { acp: { activeTurn: 'working' } } }) &&
  state.context.activeTurnId !== null &&
  state.context.permissionQueue.length === 0;

const expectNativeRequest = (requested: AcpModelSnapshot): void => {
  expect(
    requested.matches({ open: { acp: { activeTurn: 'awaitingPermission' } } }),
  ).toBe(true);
  expect(requested.context.permissionQueue[0]).toEqual(
    expect.objectContaining({ requestId: 'native-model-request' }),
  );
};

export function checkNativePermission(states: AcpModelSnapshot[]): void {
  const working = states.find(readyTurn);

  if (!working) throw new Error('The model did not reach an active Turn');

  const turnId = working.context.activeTurnId;

  if (!turnId) throw new Error('The model Turn has no id');

  const requested = getNextSnapshot(
    sessionMachine,
    working,
    nativeRequest(turnId),
  );

  expectNativeRequest(requested);
}

export function checkCreationReceipt(states: AcpModelSnapshot[]): void {
  const creating = states.find(
    (state) => state.matches('creating') && state.context.input.kind === 'new',
  );

  if (!creating) throw new Error('The model did not reach Session creation');

  const receipt = {
    status: 'accepted',
    start: { sessionId: creating.context.sessionId },
  } as const;

  const settled = getNextSnapshot(sessionMachine, creating, {
    type: 'session.creationSettled',
    receipt,
  });

  expect(settled.context.creationReceipt).toEqual(receipt);
}

const permissionHook = {
  type: 'session.permissionHooked',
  requestId: 'model-request',
  answer: { optionId: 'model-allow' },
} as const;

export function checkPermissionHook(states: AcpModelSnapshot[]): void {
  const pending = states.find(
    (state) =>
      state.matches({ open: { acp: { activeTurn: 'awaitingPermission' } } }) &&
      state.context.permissionQueue[0]?.requestId === 'model-request',
  );

  if (!pending) throw new Error('The model did not reach a Permission request');

  const answered = getNextSnapshot(sessionMachine, pending, permissionHook);
  expect(answered.context.permissionQueue).toEqual([]);
  expect(answered.matches({ open: { acp: { activeTurn: 'working' } } })).toBe(
    true,
  );
}

type ModelPaths = ReturnType<typeof createAcpSessionModel>['paths'];

type ModelStep = ModelPaths[number]['steps'][number];

type Lease = NonNullable<AcpModelSnapshot['context']['acpLease']>;

const expectIdle = (snapshot: AcpModelSnapshot, lease: Lease): void => {
  if (!snapshot.matches({ open: { acp: 'idle' } })) return;
  expect(snapshot.context.acpLease).toBe(lease);
  expect(snapshot.context.vendorSessionId).toBe(lease.sessionId);
  expect(snapshot.context.stored).toBe(true);
};

const expectAcpState = (snapshot: AcpModelSnapshot, lease: Lease): void => {
  if (snapshot.matches({ open: { acp: 'idle' } }))
    expect(snapshot.context.activeTurnId).toBeNull();

  if (snapshot.matches({ open: { acp: 'opening' } }))
    expect(snapshot.context.activeTurnId).toBeNull();
  expectIdle(snapshot, lease);
};

const expectStorageFailure = (step: ModelStep): void => {
  if (step.event.type !== 'session.storageFailing') return;
  expect(
    step.state.matches({ open: { acp: { activeTurn: 'cancelling' } } }),
  ).toBe(true);
  expect(step.state.context.activeTurnId).toBeNull();
};

const expectCheckoutTimeout = (step: ModelStep, limit: number): void => {
  if (firedDelay(step.event) !== 'checkoutLimit') return;
  expect(step.state.status).toBe('done');
  expect(step.state.output).toEqual({
    failure: expect.stringContaining(`${limit} ms`),
  });
};

const expectFeedTimeout = (step: ModelStep): void => {
  if (firedDelay(step.event) === 'feedFlushLimit')
    expect(step.state.context.failure).not.toBeNull();
};

export function checkModelPaths(
  paths: ModelPaths,
  lease: Lease,
  limit: number,
): void {
  for (const path of paths)
    for (const step of path.steps) {
      expectAcpState(step.state, lease);
      expectStorageFailure(step);
      expectCheckoutTimeout(step, limit);
      expectFeedTimeout(step);
    }
}
