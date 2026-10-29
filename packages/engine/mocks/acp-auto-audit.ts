import { getMicrosteps, type AnyStateMachine } from 'xstate';
import { sessionMachine } from '../src/sessions';
import { automaticWalks, type Walk } from './acp-auto-witnesses';
import type {
  AcpModelSnapshot,
  createAcpSessionModel,
} from './acp-session-model';

type Paths = ReturnType<typeof createAcpSessionModel>['paths'];

type Node = AnyStateMachine['root'];

type Snapshot = ReturnType<AnyStateMachine['transition']>;

const machine: AnyStateMachine = sessionMachine;

function nodesWithAutomaticTransitions(node: Node): Node[] {
  return [
    ...(node.always?.length ? [node] : []),
    ...Object.values(node.states).flatMap(nodesWithAutomaticTransitions),
  ];
}

function automaticKey(node: Node, index: number): string {
  return `${node.id} ${index}`;
}

function hasNode(snapshot: Snapshot, id: string): boolean {
  return snapshot._nodes.some((node) => node.id === id);
}

type MicrostepPair = { from: Snapshot; to: Snapshot };

function automaticTransition(
  node: Node,
  index: number,
): NonNullable<Node['always']>[number] {
  const transition = node.always?.[index];

  if (!transition) throw new Error('The automatic transition is missing');

  return transition;
}

function targetMatches(
  pair: MicrostepPair,
  node: Node,
  index: number,
): boolean {
  const transition = automaticTransition(node, index);

  if (!transition.target)
    return JSON.stringify(pair.from.value) === JSON.stringify(pair.to.value);

  return transition.target.every((target) => hasNode(pair.to, target.id));
}

function observedForNode(pair: MicrostepPair, node: Node): string[] {
  if (!hasNode(pair.from, node.id)) return [];

  return (node.always ?? []).flatMap((_, index) =>
    targetMatches(pair, node, index) ? [automaticKey(node, index)] : [],
  );
}

function observedBetween(
  from: Snapshot,
  to: Snapshot,
  nodes: Node[],
): string[] {
  return nodes.flatMap((node) => observedForNode({ from, to }, node));
}

function observedWalk(walk: Walk, nodes: Node[]): string[] {
  const steps = getMicrosteps(machine, walk.state, walk.event);

  return steps.slice(1).flatMap(([to], index) => {
    const from = steps[index]?.[0];

    if (!from) throw new Error('The model has a missing microstep');

    return observedBetween(from, to, nodes);
  });
}

function requireDistinctTargets(node: Node): void {
  const targets = (node.always ?? []).map((transition) =>
    JSON.stringify(transition.target?.map((target) => target.id) ?? []),
  );

  if (new Set(targets).size !== targets.length)
    throw new Error(`Automatic transitions in ${node.id} share a target`);
}

export function unwalkedAutomaticTransitions(
  paths: Paths,
  initial: AcpModelSnapshot,
): string[] {
  const nodes = nodesWithAutomaticTransitions(machine.root);

  for (const node of nodes) requireDistinctTargets(node);

  const seen = new Set(
    automaticWalks(paths, initial).flatMap((walk) => observedWalk(walk, nodes)),
  );

  return nodes
    .flatMap((node) =>
      (node.always ?? []).map((_, index) => automaticKey(node, index)),
    )
    .filter((key) => !seen.has(key));
}
