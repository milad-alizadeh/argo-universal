import type { AnyMachineSnapshot, EventObject } from 'xstate';
import type { StatePath } from 'xstate/graph';

// One event sent to one state.
export type Sent = { state: AnyMachineSnapshot; event: EventObject };

type Paths = StatePath<AnyMachineSnapshot, EventObject>[];

function requireStep(
  step: Paths[number]['steps'][number] | undefined,
): Paths[number]['steps'][number] {
  if (!step) throw new Error('The model path has a missing step');

  return step;
}

// Each step of each path, as the event sent to the state before it.
export const pathWalks = (paths: Paths): Sent[] =>
  paths.flatMap((path) =>
    path.steps.slice(1).map((step, index) => ({
      state: requireStep(path.steps[index]).state,
      event: step.event,
    })),
  );

export const pathStates = <TSnapshot extends AnyMachineSnapshot>(
  paths: StatePath<TSnapshot, EventObject>[],
): TSnapshot[] => paths.flatMap((path) => path.steps.map((step) => step.state));
