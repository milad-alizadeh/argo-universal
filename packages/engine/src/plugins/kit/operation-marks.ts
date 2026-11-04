import { operationLimitMs } from '@repo/contracts/plugins/plugin-operations';
import type { CallOrigin } from '../protocol/call-origin';
import type { OperationAnswering, OperationSend } from './operation-handlers';
import { swallowed } from './swallowed';
import type { LoaderCalls, LoaderPageSend, WorkerPages } from './worker-pages';

// The Operations being answered, by id, and when each began.
type Running = Map<number, number>;

type Clock = () => number;

/*
 * `argo.changed()` and the Plugin's Operations mark its pages stale, and the host makes one mark per
 * write, which also makes the Plugin's kept Queries due. A change said inside an Operation's handler joins
 * the mark the host makes when that Operation ends, failed or not. The host ends it for good once its
 * limit passes, whether or not the handler is done, so a change said after that marks as usual.
 */
export function operationMarks(
  { pages: send, origin }: Pick<LoaderCalls, 'pages' | 'origin'>,
  now: Clock = Date.now,
): Pick<WorkerPages, 'changed' | 'answering'> {
  const running: Running = new Map();

  return {
    changed: () => {
      if (!heldFor(running, origin(), now())) sendChanged(send);
    },
    answering: answering(running, now),
  };
}

// Whether the change joins a running Operation's mark: the worker runs each Operation's handler for its id.
function heldFor(running: Running, origin: CallOrigin, now: number): boolean {
  if (origin.kind !== 'operation') return false;

  const began = running.get(origin.operation);

  return began !== undefined && now - began <= operationLimitMs;
}

const sendChanged = (send: LoaderPageSend): void =>
  void send({ action: 'changed' }).catch(swallowed);

const answering =
  (running: Running, now: Clock) =>
  (send: OperationSend): OperationAnswering => ({
    during: (id, run) => {
      running.set(id, now());

      return run();
    },
    send: (call) => {
      running.delete(call.id);

      return send(call);
    },
  });
