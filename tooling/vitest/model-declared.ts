import { type AnyStateMachine, getNextSnapshot } from 'xstate';
import type { Sent } from './model-sent';

type Transition = ReturnType<AnyStateMachine['getTransitionData']>[number];

type MachineNode = AnyStateMachine['root'];

function transitionKey(transition: Transition): string {
  const index = transition.source.transitions
    .get(transition.eventType)
    ?.indexOf(transition);

  return `${transition.source.id} ${transition.eventType} ${index}`;
}

function declaredTransitions(node: MachineNode): string[] {
  return [
    ...[...node.transitions.values()].flat().map(transitionKey),
    ...Object.values(node.states).flatMap(declaredTransitions),
  ];
}

const selectedTransitions = (machine: AnyStateMachine, walk: Sent): string[] =>
  machine.getTransitionData(walk.state, walk.event).map(transitionKey);

// A witness sends an event the paths cannot reach: it must take a transition and run it.
function witnessTransitions(machine: AnyStateMachine, witness: Sent): string[] {
  const transitions = selectedTransitions(machine, witness);

  if (transitions.length === 0)
    throw new Error(`No transition for ${witness.event.type}`);
  getNextSnapshot(machine, witness.state, witness.event);

  return transitions;
}

// Each event transition the machine declares, guarded branches included, that no walk or witness takes; a test expects none.
export function unwalkedDeclaredTransitions(
  machine: AnyStateMachine,
  { walks, witnesses }: { walks: Sent[]; witnesses: Sent[] },
): string[] {
  const seen = new Set([
    ...walks.flatMap((walk) => selectedTransitions(machine, walk)),
    ...witnesses.flatMap((witness) => witnessTransitions(machine, witness)),
  ]);

  return declaredTransitions(machine.root).filter((key) => !seen.has(key));
}
