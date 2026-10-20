import type { ViewMessage, WireNode } from '@repo/contracts/plugins/wire';
import type { OpenView } from './open-view';

export function drawingFailure(
  view: OpenView,
  message: ViewMessage,
): string | undefined {
  if (view.opening.renderSlot) return;

  return rootFailure(message);
}

function rootFailure(message: ViewMessage): string | undefined {
  if (message.type !== 'snapshot') return;

  if (message.root.type !== '#render-error') return;

  return reasonOf(message.root);
}

function reasonOf(root: WireNode): string {
  return typeof root.props.reason === 'string'
    ? root.props.reason
    : 'Plugin could not draw';
}
