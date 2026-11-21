import type { WireNode } from '@repo/contracts/plugins/wire';
import {
  childNodeKey,
  slotNodeKey,
} from '@repo/contracts/plugins/wire-node-key';

// The region of a Draft page the Agent said it is writing; each naming has its own serial.
export type DraftNaming = { region: string; serial: number };

/*
 * What a Draft page's tree shows of the Agent drawing it (ADR-0057), derived from the trees it was drawn as and the
 * regions named, so the registry only draws what this says. Only a dev Plugin's Draft page has any.
 */
export type DraftDrawing = {
  root: WireNode | null;
  // Every node's address in `root`.
  paths: ReadonlySet<string>;
  // The topmost nodes of `root` whose keys are new since the tree before it; they fade in.
  fresh: ReadonlySet<string>;
  // Every node that faded in, which stays wrapped so its drawing keeps its identity once it has faded.
  faded: ReadonlySet<string>;
  // The regions wearing the drawing frame now.
  framed: ReadonlySet<string>;
  // Every region that wore the frame, which stay wrapped so a dissolving frame does not draw its region again.
  regions: ReadonlySet<string>;
  // A naming that waits for the next tree, which is the one that draws the region's skeleton.
  pending: DraftNaming | null;
  seen: number;
};

const none: ReadonlySet<string> = new Set();

export function startDrawing(naming: DraftNaming | null): DraftDrawing {
  return {
    root: null,
    paths: none,
    fresh: none,
    faded: none,
    framed: none,
    regions: none,
    pending: null,
    seen: naming?.serial ?? 0,
  };
}

/*
 * The drawing after `root` and the naming now. A tree it has already seen changes nothing. A naming waits for the
 * next tree, so the frame stands round a region the Agent has not finished; new keys inside a framed region mean it
 * landed, so its frame dissolves.
 */
export function drawn(
  state: DraftDrawing,
  root: WireNode,
  naming: DraftNaming | null,
): DraftDrawing {
  const named = naming && naming.serial > state.seen ? naming : null;

  if (root === state.root && !named) return state;

  const pending = named ?? state.pending;

  if (root === state.root)
    return { ...state, pending, seen: pending?.serial ?? state.seen };

  return drawnTree(state, root, pending);
}

function drawnTree(
  state: DraftDrawing,
  root: WireNode,
  pending: DraftNaming | null,
): DraftDrawing {
  const walked = walk(root, state.root ? state.paths : null, state.framed);
  const framed = new Set(state.framed);

  for (const region of walked.landed) framed.delete(region);

  const regions = new Set(state.regions);

  if (pending) {
    framed.add(pending.region);
    regions.add(pending.region);
  }

  return {
    root,
    paths: walked.paths,
    fresh: walked.fresh,
    faded: new Set([...state.faded, ...walked.fresh]),
    framed,
    regions,
    pending: null,
    seen: pending?.serial ?? state.seen,
  };
}

type Walked = {
  paths: Set<string>;
  fresh: Set<string>;
  landed: Set<string>;
};

// One walk of the tree at the addresses the registry draws its nodes at.
function walk(
  root: WireNode,
  before: ReadonlySet<string> | null,
  framed: ReadonlySet<string>,
): Walked {
  const walked: Walked = {
    paths: new Set(),
    fresh: new Set(),
    landed: new Set(),
  };

  type Visit = { node: WireNode; key: string; held: boolean; within: string[] };

  const visit = ({ node, key, held, within }: Visit): void => {
    const isNew = before !== null && !before.has(key);

    walked.paths.add(key);

    if (isNew && !held) walked.fresh.add(key);

    if (isNew) for (const region of within) walked.landed.add(region);

    const next = {
      held: held || isNew,
      within: framed.has(node.key) ? [...within, node.key] : within,
    };

    for (const child of node.children)
      visit({ node: child, key: childNodeKey(key, child.key), ...next });

    for (const [slot, nodes] of Object.entries(node.slots))
      for (const child of nodes)
        visit({ node: child, key: slotNodeKey(key, slot, child.key), ...next });
  };

  visit({
    node: root,
    key: childNodeKey('', root.key),
    held: false,
    within: [],
  });

  return walked;
}
