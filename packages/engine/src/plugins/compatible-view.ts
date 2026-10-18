import {
  currentPartVersions,
  type PartVersions,
} from '@repo/contracts/plugins/kit';
import { prepareWireTree } from '@repo/contracts/plugins/prepare-tree';
import type { ViewMessage, WireNode } from '@repo/contracts/plugins/wire';
import { applyPatch } from '@repo/contracts/plugins/wire-patch';
import { AdaptedViewLimits } from './adapted-view-limits';
import { diff } from './kit/diff';

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
  raw: WireNode | null;
  drawn: WireNode | null;
  limits: AdaptedViewLimits;
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

function adapt(
  trees: Trees,
  message: ViewMessage,
  parts: PartVersions,
): ViewMessage | null {
  trees.raw = nextRoot(trees.raw, message);

  if (!trees.raw) return null;

  return boundedMessage(trees, prepareWireTree(trees.raw, parts), message);
}

const emptyTrees = (refuse: (reason: string) => void): Trees => ({
  raw: null,
  drawn: null,
  limits: new AdaptedViewLimits(refuse),
});

interface Adaptation {
  parts: PartVersions;
  refuse: (reason: string) => void;
}

const ignoreRefusal = (): void => {};

// Diff the adapted trees: keyed mutations are recomputed after parts and slots are adapted.
async function* adaptedMessages(
  source: AsyncIterable<ViewMessage>,
  { parts, refuse }: Adaptation,
): AsyncGenerator<ViewMessage, void> {
  const trees = emptyTrees(refuse);

  for await (const message of source) {
    const next = adapt(trees, message, parts);

    if (next) yield next;
  }
}

export function compatibleView(
  source: AsyncIterable<ViewMessage>,
  parts: PartVersions = currentPartVersions,
  refuse: (reason: string) => void = ignoreRefusal,
): AsyncGenerator<ViewMessage, void> {
  return adaptedMessages(source, { parts, refuse });
}
