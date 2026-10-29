import { sessionMachine } from '../src/sessions';
import { modelShellChanged } from './acp-model-start-events';
import type {
  AcpModelEvent,
  AcpModelSnapshot,
  createAcpSessionModel,
} from './acp-session-model';

type Paths = ReturnType<typeof createAcpSessionModel>['paths'];

export type Walk = { state: AcpModelSnapshot; event: AcpModelEvent };

function fromPath(path: Paths[number]): Walk[] {
  return path.steps.slice(1).map((step, index) => {
    const previous = path.steps[index];

    if (!previous) throw new Error('The model path has a missing step');

    return { state: previous.state, event: step.event };
  });
}

function synthetic(
  initial: AcpModelSnapshot,
  value: AcpModelSnapshot['value'],
  context: AcpModelSnapshot['context'],
): Walk {
  const state = sessionMachine.resolveState({ value, context });
  Object.assign(state.children, initial.children);

  return { state, event: modelShellChanged(state) };
}

function entryWalks(initial: AcpModelSnapshot): Walk[] {
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

function archiveWalk(initial: AcpModelSnapshot): Walk {
  return synthetic(
    initial,
    { open: { acp: 'entering' } },
    { ...initial.context, archiveRequested: true },
  );
}

function heldWalk(states: AcpModelSnapshot[], initial: AcpModelSnapshot): Walk {
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
): Walk[] {
  const states = paths.flatMap((path) => path.steps.map((step) => step.state));

  return [
    ...paths.flatMap(fromPath),
    ...entryWalks(initial),
    archiveWalk(initial),
    heldWalk(states, initial),
  ];
}
