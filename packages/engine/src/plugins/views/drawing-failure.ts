import type {
  PatchOp,
  ViewMessage,
  WireNode,
} from '@repo/contracts/plugins/wire';
import type { OpenView } from './open-view';

export function drawingFailure(
  view: OpenView,
  message: ViewMessage,
): string | undefined {
  // A replaceable Slot's `#render-error` asks for core's own drawing, so it fails nothing (ADR-0037).
  if (view.draws.kind === 'replaceable') return;

  return rootFailure(nextRootNode(message));
}

function rootFailure(root: WireNode | undefined): string | undefined {
  if (root?.type !== '#render-error') return;

  return reasonOf(root);
}

/*
 * The root a message leaves behind. A page sends a snapshot only until it first draws, so a throw after
 * that arrives as the patch replacing the root, and no other op can change the root node.
 */
function nextRootNode(message: ViewMessage): WireNode | undefined {
  if (message.type === 'snapshot') return message.root;

  return message.ops.findLast(replacesRoot)?.node;
}

const replacesRoot = (op: PatchOp): op is Extract<PatchOp, { op: 'replace' }> =>
  op.op === 'replace' && op.key.length === 0;

function reasonOf(root: WireNode): string {
  return typeof root.props.reason === 'string'
    ? root.props.reason
    : 'Plugin could not draw';
}
