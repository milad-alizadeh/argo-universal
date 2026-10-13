import { matchesState } from 'xstate';
import type { StatePath } from 'xstate/graph';
import { states } from './engine-model-assertions';
import type { EngineEvent } from './engine-model-events';
import { executors } from './engine-model-executors';
import type { EngineSnapshot } from './engine-model-logic';
export async function executeStep(
  step: StatePath<EngineSnapshot, EngineEvent>['steps'][number],
): Promise<void> {
  const execute = executors[step.event.type];
  if (!execute)
    throw new Error(`Missing Engine executor for ${step.event.type}`);
  await execute(step);
  assertState(step.state);
}
function assertState(snapshot: EngineSnapshot): void {
  for (const [key, assertion] of Object.entries(states)) {
    if (matchesState(key, snapshot.value)) assertion(snapshot);
  }
}
