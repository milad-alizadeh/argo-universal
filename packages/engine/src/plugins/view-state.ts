import type { ViewMessage } from '@repo/contracts/plugins/wire';
import {
  pluginMessageBytes,
  pluginPageBytes,
  pluginPageFallback,
} from '@repo/contracts/plugins/wire-limits';
import type { OpenView } from './open-view';
import { nextRoot, updateView } from './view-messages';
import { wireSizeReason } from './wire-size';

type Reception = { log: (line: string) => void; revision: number };

export function receive(
  view: OpenView,
  message: ViewMessage,
  reception: Reception,
): void {
  if (ignoresPatch(view, message)) return;
  const reason = refusalReason(view, message);

  if (reason) return refuse(view, reason, reception);
  view.refused = false;
  updateView(view, message, reception.revision);
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
): void {
  if (view.refused) return;
  view.refused = true;
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
