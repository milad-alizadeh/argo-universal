import type { CallOrigin } from '../protocol/call-origin';
import type { LoaderCalls, LoaderPageSend, LoaderPages } from './loader-pages';
import type { OperationAnswering, OperationSend } from './operation-handlers';
import { swallowed } from './swallowed';

// The ids of the Operations being answered.
type Running = Set<number>;

/*
 * `argo.changed()` and the Plugin's Operations mark its pages stale, and the host makes one mark per
 * write, which also makes the Plugin's kept Queries due. A change said inside an Operation's handler joins
 * the mark the host makes when that Operation ends, failed or not.
 */
export function operationMarks({
  pages: send,
  origin,
}: Pick<LoaderCalls, 'pages' | 'origin'>): Pick<
  LoaderPages,
  'changed' | 'answering'
> {
  const running: Running = new Set();

  return {
    changed: () => {
      if (!heldFor(running, origin())) sendChanged(send);
    },
    answering: answering(running),
  };
}

// Whether the change joins a running Operation's mark: the worker runs each Operation's handler for its id.
function heldFor(running: Running, origin: CallOrigin): boolean {
  if (!('operation' in origin)) return false;

  return running.has(origin.operation);
}

const sendChanged = (send: LoaderPageSend): void =>
  void send({ action: 'changed' }).catch(swallowed);

const answering =
  (running: Running) =>
  (send: OperationSend): OperationAnswering => ({
    during: (id, run) => {
      running.add(id);

      return run();
    },
    send: (call) => {
      running.delete(call.id);

      return send(call);
    },
  });
