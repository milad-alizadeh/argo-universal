import type {
  Appended,
  AppendStep,
  DrawAnswer,
  Drawn,
} from '@repo/contracts/plugins/page-draw';
import type { WireNode } from '@repo/contracts/plugins/wire';

/*
 * What the App keeps for one Loader page address: the tree, the hash the Server gave it, and how many pages of
 * its paged list it shows; or why the last draw failed. A tree the App changed itself, as an optimistic patch
 * does, has no hash, so the next answer is a whole tree.
 */
export type Answer =
  | { ok: true; root: WireNode; hash?: string; pages: number }
  | { ok: false; error: string };

export type Kept = Extract<Answer, { ok: true }>;

type Grown = Extract<DrawAnswer, { kind: 'unchanged' | 'append' }>;

// What the App keeps after an answer: the whole tree, the same one, or the kept one with the appended rows.
export function keptAfter(kept: Kept | undefined, answer: DrawAnswer): Answer {
  if (answer.kind === 'failed') return { ok: false, error: answer.error };

  return answer.kind === 'tree'
    ? { ...hashed(answer), ok: true, root: answer.root }
    : grownFrom(kept, answer);
}

const hashed = ({ hash, pages }: Drawn): Drawn => ({ hash, pages });

const notKept: Answer = {
  ok: false,
  error: 'The page answered for a tree the App does not keep',
};

function grownFrom(kept: Kept | undefined, answer: Grown): Answer {
  if (!kept) return notKept;

  return answer.kind === 'unchanged'
    ? sameTree(kept, answer)
    : {
        ...hashed(answer),
        ok: true,
        root: appendedAt(kept.root, answer.append),
      };
}

// The very object kept, so nothing that draws it renders again, unless its hash or page count moved.
const sameTree = (kept: Kept, { hash, pages }: Grown): Kept =>
  kept.hash === hash && kept.pages === pages ? kept : { ...kept, hash, pages };

// The tree with the rows appended where `at` leads; every node off that path keeps its identity.
export function appendedAt(node: WireNode, appended: Appended): WireNode {
  const [step, ...rest] = appended.at;

  if (!step)
    return {
      ...node,
      props: appended.props,
      children: [...node.children, ...appended.rows],
    };

  return appendedWithin(node, step, { ...appended, at: rest });
}

function appendedWithin(
  node: WireNode,
  step: AppendStep,
  inner: Appended,
): WireNode {
  if (step.slot === undefined)
    return { ...node, children: replaced(node.children, step, inner) };

  const slot = replaced(node.slots[step.slot] ?? [], step, inner);

  return { ...node, slots: { ...node.slots, [step.slot]: slot } };
}

const replaced = (
  nodes: WireNode[],
  { index }: AppendStep,
  inner: Appended,
): WireNode[] =>
  nodes.map((child, at) => (at === index ? appendedAt(child, inner) : child));
