import type { ViewMessage, WireNode } from '@repo/contracts/plugins/wire';
import {
  pluginMessageBytes,
  pluginPageBytes,
  pluginPageFallback,
} from '@repo/contracts/plugins/wire-limits';
import { nextRoot } from '@repo/contracts/plugins/wire-patch';
import { sanitizeTree } from '../visual/sanitize-tree';
import { updateView } from './messages';
import type { OpenView } from './open-view';
import { wireSizeReason } from './wire-size';

type Reception = { log: (line: string) => void; revision: number };

export function receive(
  view: OpenView,
  message: ViewMessage,
  reception: Reception,
): void {
  handleMessage(view, message, reception);
}

function handleMessage(
  view: OpenView,
  message: ViewMessage,
  reception: Reception,
): void {
  if (ignoresPatch(view, message)) return;
  const reason = refusalReason(view, message);

  if (!reason) return acceptMessage(view, message, reception);

  refuse(view, reason, reception);
}

function acceptMessage(
  view: OpenView,
  message: ViewMessage,
  reception: Reception,
): void {
  const root = nextRoot(view.root, message);

  if (!root) {
    view.refused = false;

    return updateView(view, message, reception.revision);
  }

  receiveTree({ view, message, root, reception });
}

interface TreeReception {
  view: OpenView;
  message: ViewMessage;
  root: NonNullable<ReturnType<typeof nextRoot>>;
  reception: Reception;
}

function receiveTree({ view, message, root, reception }: TreeReception): void {
  if (view.opening.renderSlot)
    return updateView(view, message, reception.revision);
  const sanitized = sanitizeTree(root);

  logRefusals(view, sanitized.refused, reception);

  view.refused = false;

  const normalized = normalizedMessage(message, sanitized);

  updateView(view, normalized, reception.revision);
}

function logRefusals(
  view: OpenView,
  refusals: Array<{ node: string; reason: string }>,
  reception: Reception,
): void {
  for (const item of refusals) {
    reception.log(
      `Plugin ${view.pluginId}: refused ${view.opening.path} node ${item.node}: ${item.reason}`,
    );
  }
}

function normalizedMessage(
  message: ViewMessage,
  sanitized: ReturnType<typeof sanitizeTree>,
): ViewMessage {
  if (!sanitized.containsSvg && sanitized.refused.length === 0) return message;

  return { ...message, type: 'snapshot', root: sanitized.root };
}

function refusalReason(view: OpenView, message: ViewMessage): string | null {
  const reason = wireSizeReason(message, pluginMessageBytes, 'message');

  if (reason) return reason;
  const root = nextRoot(view.root, message);

  return root ? wireSizeReason(root, pluginPageBytes, 'page') : null;
}

function refuse(view: OpenView, reason: string, reception: Reception): void {
  if (view.refused) return;

  if (!view.opening.renderSlot)
    reception.log(
      `Plugin ${view.pluginId}: refused ${view.opening.path}: ${reason}`,
    );
  refuseSilently(view, reception.revision);
}

function refuseSilently(view: OpenView, revision: number): void {
  if (view.refused) return;
  view.refused = true;
  updateView(
    view,
    {
      type: 'snapshot',
      revision: 0,
      root: refusedRoot(view),
    },
    revision,
  );
  view.workerRevision = null;
}

const ignoresPatch = (view: OpenView, message: ViewMessage): boolean =>
  view.refused && message.type === 'patch';

function refusedRoot(view: OpenView): WireNode {
  return view.opening.renderSlot
    ? {
        type: '#render-error',
        key: '0',
        props: { reason: 'tree exceeds wire limits' },
        children: [],
        slots: {},
      }
    : pluginPageFallback;
}
