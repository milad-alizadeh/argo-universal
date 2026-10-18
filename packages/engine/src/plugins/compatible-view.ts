import {
  legacyPartVersions,
  type PartVersions,
} from '@repo/contracts/plugins/kit';
import { prepareWireTree } from '@repo/contracts/plugins/prepare-tree';
import type { ViewMessage, WireNode } from '@repo/contracts/plugins/wire';
import { applyPatch } from '@repo/contracts/plugins/wire-patch';
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
  revision: number,
): ViewMessage {
  const ops = before ? diff(before, next) : [];

  return ops.length
    ? { type: 'patch', revision, ops }
    : { type: 'snapshot', revision, root: next };
}

interface Trees {
  raw: WireNode | null;
  drawn: WireNode | null;
}

function adapt(
  trees: Trees,
  message: ViewMessage,
  parts: PartVersions,
): ViewMessage | null {
  trees.raw = nextRoot(trees.raw, message);

  if (!trees.raw) return null;

  const next = prepareWireTree(trees.raw, parts);
  const before = message.type === 'snapshot' ? null : trees.drawn;
  const result = outgoing(before, next, message.revision);

  trees.drawn = next;

  return result;
}

const emptyTrees = (): Trees => ({ raw: null, drawn: null });

// Diff the adapted trees: positional patches from a Plugin cannot address a pruned App tree.
async function* adaptedMessages(
  source: AsyncIterable<ViewMessage>,
  parts: PartVersions,
): AsyncGenerator<ViewMessage> {
  const trees = emptyTrees();

  for await (const message of source) {
    const next = adapt(trees, message, parts);

    if (next) yield next;
  }
}

export function compatibleView(
  source: AsyncIterable<ViewMessage>,
  parts: PartVersions = legacyPartVersions,
): AsyncGenerator<ViewMessage> {
  return adaptedMessages(source, parts);
}
