import { getNextSnapshot, type AnyStateMachine } from 'xstate';
import { sessionMachine } from '../src/sessions';
import type {
  AcpModelEvent,
  AcpModelSnapshot,
  createAcpSessionModel,
} from './acp-session-model';
import { extraTransitionWitnesses } from './acp-transition-witnesses';

type Transition = ReturnType<AnyStateMachine['getTransitionData']>[number];

type MachineNode = typeof sessionMachine.root;

type Paths = ReturnType<typeof createAcpSessionModel>['paths'];

const graphMachine: AnyStateMachine = sessionMachine;

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

function selectedTransitions(
  state: AcpModelSnapshot,
  event: AcpModelEvent,
): string[] {
  return graphMachine.getTransitionData(state, event).map(transitionKey);
}

function requireStep(
  step: Paths[number]['steps'][number] | undefined,
): Paths[number]['steps'][number] {
  if (!step) throw new Error('The model path has a missing step');

  return step;
}

function pathTransitions(path: Paths[number]): string[] {
  return path.steps
    .slice(1)
    .flatMap((current, index) =>
      selectedTransitions(requireStep(path.steps[index]).state, current.event),
    );
}

function witnessTransitions(
  witness: ReturnType<typeof extraTransitionWitnesses>[number],
): string[] {
  const transitions = selectedTransitions(witness.state, witness.event);

  if (transitions.length === 0)
    throw new Error(`No transition for ${witness.event.type}`);
  getNextSnapshot(sessionMachine, witness.state, witness.event);

  return transitions;
}

export function unwalkedSessionTransitions(paths: Paths): string[] {
  const states = paths.flatMap((path) => path.steps.map((step) => step.state));

  const seen = new Set([
    ...paths.flatMap(pathTransitions),
    ...extraTransitionWitnesses(states).flatMap(witnessTransitions),
  ]);

  return declaredTransitions(sessionMachine.root).filter(
    (key) => !seen.has(key),
  );
}
