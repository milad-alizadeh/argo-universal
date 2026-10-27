import { prepareWireTree } from '@repo/contracts/plugins/prepare-tree';
import type {
  PatchOp,
  ViewMessage,
  WireNode,
} from '@repo/contracts/plugins/wire';
import {
  pluginMessageBytes,
  pluginPageBytes,
} from '@repo/contracts/plugins/wire-limits';
import { nextRoot } from '@repo/contracts/plugins/wire-patch';
import { sanitizeTree } from '../visual/sanitize-tree';
import type { OpenView } from './open-view';

type Reception = { log: (line: string) => void; revision: number };

type Drawing = { view: OpenView; message: ViewMessage; reception: Reception };

/*
 * Draws one message from the worker for the view's App: folds it onto the Plugin's tree, which the view
 * keeps as the worker sent it, then sanitises, prepares and caps a copy and sends the App what changed. A
 * patch with no tree under it, before the first snapshot or after a refused one, draws nothing, except a
 * throw replacing the root, which still fails the view. Returns why the view failed, if it did.
 */
export function drawTree(
  view: OpenView,
  message: ViewMessage,
  reception: Reception,
): string | null {
  const drawing = { view, message, reception };
  const tooLarge = sizeReason(message, pluginMessageBytes, 'message');

  if (tooLarge) return refuseTree(drawing, tooLarge);
  const root = nextRoot(view.root, message);

  return root ? pluginTree(drawing, root) : thrownRoot(drawing, message);
}

// A page sends a snapshot only until it first draws, so a throw after that arrives as the patch replacing the root.
function thrownRoot({ view }: Drawing, message: ViewMessage): string | null {
  const thrown = replacedRoot(message);

  return thrown ? (view.draws.failure(thrown) ?? null) : null;
}

const replacedRoot = (message: ViewMessage): WireNode | undefined =>
  message.type === 'patch'
    ? message.ops.findLast(replacesRoot)?.node
    : undefined;

const replacesRoot = (op: PatchOp): op is Extract<PatchOp, { op: 'replace' }> =>
  op.op === 'replace' && op.key.length === 0;

function pluginTree(drawing: Drawing, root: WireNode): string | null {
  const failure = drawing.view.draws.failure(root);

  if (failure !== undefined) return failure;
  const tooLarge = sizeReason(root, pluginPageBytes, 'page');

  if (tooLarge) return refuseTree(drawing, tooLarge);
  drawing.view.root = root;

  return sanitized(drawing, sanitizeTree(root));
}

function sanitized(
  drawing: Drawing,
  { root, refused }: ReturnType<typeof sanitizeTree>,
): string | null {
  const { view, reception } = drawing;
  const failure = view.draws.refusedSvg(view, refused, reception.log);

  if (failure !== undefined) return failure;

  return prepared(drawing, prepareWireTree(root));
}

// Sanitising and preparation may change an admissible tree or grow it past the caps: the Plugin's own tree is kept, so a patch can recover it.
function prepared(drawing: Drawing, tree: WireNode): string | null {
  const { view, message } = drawing;
  const held = message.type === 'snapshot' ? null : view.drawn;
  const outgoing = appMessage(drawing, tree, view.draws.changes(held, tree));

  const tooLarge = preparedSizeReason(tree, outgoing);

  if (tooLarge) return refuse(drawing, tooLarge);
  view.refused = false;
  view.workerRevision = message.revision;
  show(view, tree, outgoing);

  return null;
}

// The worker's own message is over the caps, so later patches have no tree to apply to until a snapshot.
function refuseTree(drawing: Drawing, reason: string): string | null {
  drawing.view.root = null;

  return refuse(drawing, reason);
}

// The App is sent the fallback once, however many refused messages follow; a view without one fails.
function refuse(drawing: Drawing, reason: string): string | null {
  const { view, reception } = drawing;
  const { fallback } = view.draws;
  view.workerRevision = null;

  if (!fallback) return reason;

  if (view.refused) return null;
  view.refused = true;
  reception.log(
    `Plugin ${view.pluginId}: refused ${view.opening.path}: ${reason}`,
  );
  show(view, fallback, appMessage(drawing, fallback, []));

  return null;
}

// The changes when there are any, or the whole tree.
function appMessage(
  { view, reception }: Drawing,
  tree: WireNode,
  ops: PatchOp[],
): ViewMessage {
  const { revision } = reception;
  const { viewId } = view.opening;

  return ops.length
    ? { type: 'patch', revision, viewId, ops }
    : { type: 'snapshot', revision, viewId, root: tree };
}

function show(view: OpenView, tree: WireNode, message: ViewMessage): void {
  view.drawn = tree;
  view.revision = message.revision;
  view.events.emit('message', message);
}

const preparedSizeReason = (
  tree: WireNode,
  outgoing: ViewMessage,
): string | null =>
  sizeReason(tree, pluginPageBytes, 'prepared page') ??
  sizeReason(outgoing, pluginMessageBytes, 'prepared message');

const sizeReason = (
  value: ViewMessage | WireNode,
  limit: number,
  kind: string,
): string | null =>
  Buffer.byteLength(JSON.stringify(value), 'utf8') > limit
    ? `${kind} exceeds ${limit} bytes`
    : null;
