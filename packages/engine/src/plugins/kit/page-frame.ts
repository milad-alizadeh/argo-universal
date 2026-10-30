import { reportFailure } from './host-config';
import type { OpenView } from './page-view';
import { flushEffects } from './reconciler';
import { kitScheduler } from './scheduler';

const frameMs = 16;
// Past this a view that is not ready no longer holds back an acknowledgement.
const sentWaitMs = 1000;

export function schedulePage(view: OpenView, commit: () => void): void {
  if (view.frame !== undefined) return;
  view.frame = kitScheduler.schedule(() => {
    view.frame = undefined;
    publishCommit(commit);
    releaseWaiters(view);
  }, frameMs);
}

// A commit that is not ready schedules the next frame itself, so the waiters keep waiting for that one.
function releaseWaiters(view: OpenView): void {
  if (view.frame !== undefined) return;

  for (const release of view.sentWaiters.splice(0)) release();
}

/*
 * Resolves once the view's tree has been sent for every update made so far. React renders an update
 * on its own turn and the frame sends it later, so one macrotask lets the render reach the frame.
 */
export async function whenSent(view: OpenView): Promise<void> {
  await nextMacrotask();

  if (view.frame === undefined) return;

  const sent = new Promise<void>((resolve) => view.sentWaiters.push(resolve));
  const waited = new Promise<void>((resolve) =>
    kitScheduler.schedule(resolve, sentWaitMs),
  );

  await Promise.race([sent, waited]);
}

const nextMacrotask = (): Promise<void> =>
  new Promise((resolve) => kitScheduler.schedule(resolve, 0));

function publishCommit(commit: () => void): void {
  try {
    flushEffects();
    commit();
  } catch (error) {
    reportFailure(error instanceof Error ? error : new Error(String(error)));
  }
}

export function cancelPageFrame(view: OpenView): void {
  kitScheduler.cancel(view.frame);
  view.frame = undefined;
  releaseWaiters(view);
}
