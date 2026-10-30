import {
  type AnyStateMachine,
  type EventObject,
  type ExecutableActionObject,
  type InputFrom,
  initialTransition,
  transition,
} from 'xstate';
import { isDelayEvent } from './model-edges';
import type {
  DeclaredDelay,
  Modelled,
  ModelStep,
  PathRun,
} from './model-types';
import { declaredDelay } from './model-validate';
import type { SnapshotOf } from './model-walk';

type Params = ExecutableActionObject['params'];

const isRecord = (params: Params): params is Record<string, Params> =>
  typeof params === 'object' && params !== null;

const hasDelayId = (params: Params): params is { id: string } =>
  isRecord(params) &&
  typeof params.id === 'string' &&
  isDelayEvent({ type: params.id });

// The id the machine's own scheduler gives a delayed event is its type.
const raisedId = ({
  type,
  params,
}: ExecutableActionObject): string | undefined =>
  type === 'xstate.raise' && hasDelayId(params) ? params.id : undefined;

// The steps of a path that a delay is set between: the event sent, and the state it was sent to.
interface Steps<TMachine extends AnyStateMachine, TEvent extends EventObject> {
  step: ModelStep<TMachine, TEvent>;
  previous: ModelStep<TMachine, TEvent> | undefined;
}

// The delays a step sets going, by the type of the event each will send; the machine says which, never how long.
function delaysSetBy(
  machine: AnyStateMachine,
  input: InputFrom<AnyStateMachine>,
  { step, previous }: Steps<AnyStateMachine, EventObject>,
): string[] {
  const [, actions] = previous
    ? transition(machine, previous.state, step.event)
    : initialTransition(machine, input);

  return actions.flatMap((action) => raisedId(action) ?? []);
}

function declaredMs<TMachine extends AnyStateMachine>(
  delays: Record<string, DeclaredDelay<TMachine>>,
  id: string,
  snapshot: SnapshotOf<TMachine>,
): number {
  const declared = declaredDelay(delays, id);

  return typeof declared === 'function' ? declared(snapshot) : declared;
}

// Notes when each delay the step sets going falls due, by the clock the real actor runs on and the milliseconds the model declares.
export function noteDelays<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
>(
  modelled: Modelled<TMachine, TEvent>,
  run: PathRun,
  steps: Steps<TMachine, TEvent>,
): void {
  const { machine, graph } = modelled;

  for (const id of delaysSetBy(machine, graph.input, steps))
    run.due.set(
      id,
      Date.now() + declaredMs(modelled.actor.delays, id, steps.step.state),
    );
}
