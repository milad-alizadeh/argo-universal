import type { LoaderPageSend, LoaderPages } from './loader-pages';
import type { OperationAnswering, OperationSend } from './operation-handlers';
import { currentOperation, inOperation } from './operation-scope';

// The Operations being answered, each with whether its handler said `argo.changed()`.
type Running = Map<number, boolean>;

/*
 * `argo.changed()` and the Plugin's Operations mark its pages stale, and the host makes one mark per
 * write, which also makes the Plugin's kept Queries due. A change said inside an Operation's handler joins
 * the mark the host makes when that Operation answers; a failed Operation makes none, so its change is
 * sent as it answers.
 */
export function operationMarks(
  send: LoaderPageSend,
): Pick<LoaderPages, 'changed' | 'answering'> {
  const running: Running = new Map();

  return {
    changed: () => {
      if (!heldFor(running, currentOperation())) sendChanged(send);
    },
    answering: answering(send, running),
  };
}

// Whether the change joins a running Operation's mark.
function heldFor(running: Running, id: number | null): boolean {
  if (id === null || !running.has(id)) return false;

  running.set(id, true);

  return true;
}

const sendChanged = (send: LoaderPageSend): void =>
  void send({ action: 'changed' }).catch(() => null);

const answering =
  (pagesSend: LoaderPageSend, running: Running) =>
  (send: OperationSend): OperationAnswering => ({
    during: (id, run) => {
      running.set(id, false);

      return inOperation(id, run);
    },
    send: (call) => {
      const changed = running.get(call.id) === true;

      running.delete(call.id);

      if (changed && call.action === 'failed') sendChanged(pagesSend);

      return send(call);
    },
  });
