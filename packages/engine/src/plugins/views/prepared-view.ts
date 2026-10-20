import { prepareWireTree } from '@repo/contracts/plugins/prepare-tree';
import type { ViewMessage, WireNode } from '@repo/contracts/plugins/wire';
import { pluginPageFallback } from '@repo/contracts/plugins/wire-limits';
import { applyPatch } from '@repo/contracts/plugins/wire-patch';
import { diff } from '../kit/diff';
import { PreparedViewLimits } from './prepared-view-limits';

function nextRoot(
  root: WireNode | null,
  message: ViewMessage,
): WireNode | null {
  if (message.type === 'snapshot') return message.root;

  return root && applyPatch(root, message.ops);
}

function outgoing(
  before: WireNode | null,
  next: WireNode,
  message: ViewMessage,
): ViewMessage {
  const ops = before ? diff(before, next) : [];

  return ops.length
    ? { type: 'patch', revision: message.revision, viewId: message.viewId, ops }
    : {
        type: 'snapshot',
        revision: message.revision,
        viewId: message.viewId,
        root: next,
      };
}

interface Trees {
  prepare: (root: WireNode) => WireNode;
  raw: WireNode | null;
  drawn: WireNode | null;
  limits: PreparedViewLimits;
}

function rememberDrawn(
  trees: Trees,
  message: ViewMessage,
  next: WireNode,
): void {
  trees.drawn = message.type === 'snapshot' ? message.root : next;
}

function boundedMessage(
  trees: Trees,
  next: WireNode,
  message: ViewMessage,
): ViewMessage | null {
  const before = message.type === 'snapshot' ? null : trees.drawn;

  const result = trees.limits.accept(next, outgoing(before, next, message));

  if (result) rememberDrawn(trees, result, next);

  return result;
}

function prepared(trees: Trees, message: ViewMessage): ViewMessage | null {
  trees.raw = nextRoot(trees.raw, message);

  if (!trees.raw) return null;

  return boundedMessage(
    trees,
    trees.prepare(prepareWireTree(trees.raw)),
    message,
  );
}

const ignoreRefusal = (): void => {};

// Diff the prepared trees: keyed mutations are recomputed after invalid nodes are dropped or replaced.
async function* preparedMessages(
  source: AsyncIterable<ViewMessage>,
  refuse: (reason: string) => void,
  prepare: Trees['prepare'],
): AsyncGenerator<ViewMessage, void> {
  const trees = initialTrees(prepare, refuse);

  for await (const message of source) {
    const next = prepared(trees, message);

    if (next) yield next;
  }
}

function initialTrees(
  prepare: Trees['prepare'],
  refuse: (reason: string) => void,
): Trees {
  return {
    prepare,
    raw: null,
    drawn: null,
    limits: new PreparedViewLimits(refuse, pluginPageFallback),
  };
}

export function preparedView(
  source: AsyncIterable<ViewMessage>,
  refuse: (reason: string) => void = ignoreRefusal,
  prepare: Trees['prepare'] = (root) => root,
): AsyncGenerator<ViewMessage, void> {
  return preparedMessages(source, refuse, prepare);
}
