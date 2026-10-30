import { pathStates, pathWalks, type Sent } from '@repo/vitest/model-audit';
import { sessionMachine } from '../src/sessions';
import { modelShellChanged } from './acp-model-start-events';
import type {
  AcpModelSnapshot,
  createAcpSessionModel,
} from './acp-session-model';

type Paths = ReturnType<typeof createAcpSessionModel>['paths'];

function synthetic(
  initial: AcpModelSnapshot,
  value: AcpModelSnapshot['value'],
  context: AcpModelSnapshot['context'],
): Sent {
  const state = sessionMachine.resolveState({ value, context });
  Object.assign(state.children, initial.children);

  return { state, event: modelShellChanged(state) };
}

function entryWalks(initial: AcpModelSnapshot): Sent[] {
  const context = initial.context;

  if (context.input.kind !== 'new')
    throw new Error('The initial Session is not new');

  return [
    synthetic(initial, 'entering', context),
    synthetic(initial, 'entering', {
      ...context,
      input: { ...context.input, kind: 'existing' },
    }),
  ];
}

function archiveWalk(initial: AcpModelSnapshot): Sent {
  return synthetic(
    initial,
    { open: { acp: 'entering' } },
    { ...initial.context, archiveRequested: true },
  );
}

function heldWalk(states: AcpModelSnapshot[], initial: AcpModelSnapshot): Sent {
  const pending = states.find(
    (state) => state.context.pendingSubmission !== null,
  );

  if (!pending) throw new Error('The model did not reach a held submission');

  return synthetic(
    initial,
    { open: { acp: 'idle' } },
    {
      ...pending.context,
      configQueue: [],
      heldConfig: [{ configId: 'fast', value: true }],
    },
  );
}

export function automaticWalks(
  paths: Paths,
  initial: AcpModelSnapshot,
): Sent[] {
  const states = pathStates(paths);

  return [
    ...pathWalks(paths),
    ...entryWalks(initial),
    archiveWalk(initial),
    heldWalk(states, initial),
  ];
}
