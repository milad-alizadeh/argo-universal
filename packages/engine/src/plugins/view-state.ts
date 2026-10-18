import type { ViewMessage } from '@repo/contracts/plugins/wire';
import {
  pluginMessageBytes,
  pluginPageBytes,
  pluginPageFallback,
} from '@repo/contracts/plugins/wire-limits';
import type { OpenView } from './open-view';
import { sanitizeTree } from './svg-view';
import { nextRoot, updateView } from './view-messages';
import { wireSizeReason } from './wire-size';

// ADR-0027's Replaceable Slot IDs are not published by the current wire contract.
// Keep the refusal guard ready for those IDs; #833 supports ordinary projectDetails Slots.
const replaceableSlotIds = new Set([
  'argo/feed/tool-call/v1',
  'argo/feed/message/v1',
  'argo/composer/above/v1',
]);

type Reception = { log: (line: string) => void; revision: number };

export function receive(
  view: OpenView,
  message: ViewMessage,
  reception: Reception,
): void {
  if (ignoresPatch(view, message)) return;
  const reason = refusalReason(view, message);

  if (reason) return refuse(view, reason, reception);

  const root = nextRoot(view.root, message);

  if (root) {
    const sanitized = sanitizeTree(root);

    if (sanitized.refused.length) {
      for (const item of sanitized.refused)
        reception.log(
          `Plugin ${view.pluginId}: refused ${view.opening.path} node ${item.node}: ${item.reason}`,
        );

      if (isReplaceableSlot(view))
        return refuse(
          view,
          `Svg refused; core draws its own`,
          reception,
          false,
        );
    }

    view.refused = false;
    const normalized =
      sanitized.containsSvg || sanitized.refused.length > 0
        ? { ...message, type: 'snapshot' as const, root: sanitized.root }
        : message;
    updateView(view, normalized, reception.revision);
    return;
  }

  view.refused = false;
  updateView(view, message, reception.revision);
}

function isReplaceableSlot(view: OpenView): boolean {
  return replaceableSlotIds.has(view.opening.slot?.slotId ?? '');
}

function refusalReason(view: OpenView, message: ViewMessage): string | null {
  const reason = wireSizeReason(message, pluginMessageBytes, 'message');

  if (reason) return reason;
  const root = nextRoot(view.root, message);

  return root ? wireSizeReason(root, pluginPageBytes, 'page') : null;
}

function refuse(
  view: OpenView,
  reason: string,
  { log, revision }: Reception,
  logRefusal = true,
): void {
  if (view.refused) return;
  view.refused = true;
  if (logRefusal)
    log(`Plugin ${view.pluginId}: refused ${view.opening.path}: ${reason}`);
  updateView(
    view,
    { type: 'snapshot', revision: 0, root: pluginPageFallback },
    revision,
  );
  view.workerRevision = null;
}

const ignoresPatch = (view: OpenView, message: ViewMessage): boolean =>
  view.refused && message.type === 'patch';
