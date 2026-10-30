import {
  type AnyMachineSnapshot,
  type AnyStateMachine,
  getMicrosteps,
} from 'xstate';
import type { Sent } from './model-sent';

type Node = AnyStateMachine['root'];

type MicrostepPair = { from: AnyMachineSnapshot; to: AnyMachineSnapshot };

function nodesWithAutomaticTransitions(node: Node): Node[] {
  return [
    ...(node.always?.length ? [node] : []),
    ...Object.values(node.states).flatMap(nodesWithAutomaticTransitions),
  ];
}

const automaticKey = (node: Node, index: number): string =>
  `${node.id} ${index}`;

const hasNode = (snapshot: AnyMachineSnapshot, id: string): boolean =>
  snapshot._nodes.some((node) => node.id === id);

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

function observedWalk(
  machine: AnyStateMachine,
  walk: Sent,
  nodes: Node[],
): string[] {
  const steps = getMicrosteps(machine, walk.state, walk.event);

  return steps.slice(1).flatMap(([to], index) => {
    const from = steps[index]?.[0];

    if (!from) throw new Error('The model has a missing microstep');

    return nodes.flatMap((node) => observedForNode({ from, to }, node));
  });
}

function requireDistinctTargets(node: Node): void {
  const targets = (node.always ?? []).map((transition) =>
    JSON.stringify(transition.target?.map((target) => target.id) ?? []),
  );

  if (new Set(targets).size !== targets.length)
    throw new Error(`Automatic transitions in ${node.id} share a target`);
}

// Each `always` transition that no walk takes, as "node index"; a test expects none.
export function unwalkedAutomaticTransitions(
  machine: AnyStateMachine,
  walks: Sent[],
): string[] {
  const nodes = nodesWithAutomaticTransitions(machine.root);

  for (const node of nodes) requireDistinctTargets(node);

  const seen = new Set(
    walks.flatMap((walk) => observedWalk(machine, walk, nodes)),
  );

  return nodes
    .flatMap((node) =>
      (node.always ?? []).map((_, index) => automaticKey(node, index)),
    )
    .filter((key) => !seen.has(key));
}
