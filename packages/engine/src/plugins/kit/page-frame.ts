import { reportFailure } from './host-config';
import type { OpenView } from './page-view';
import { flushEffects } from './reconciler';
import { kitScheduler } from './scheduler';

const frameMs = 16;

export function schedulePage(view: OpenView, commit: () => void): void {
  if (view.frame !== undefined) return;
  view.frame = kitScheduler.schedule(() => {
    view.frame = undefined;
    publishCommit(commit);
    releaseRendered(view);
  }, frameMs);
}

// A commit that is not ready schedules the next frame itself, so the waiters keep waiting for that one.
function releaseRendered(view: OpenView): void {
  if (view.frame !== undefined) return;

  for (const release of view.rendered.splice(0)) release();
}

/*
 * Resolves once the view's tree has been sent for every update made so far. React renders an update
 * on its own turn and the frame sends it later, so one macrotask lets the render reach the frame.
 */
export async function whenRendered(view: OpenView): Promise<void> {
  await new Promise<void>((resolve) => kitScheduler.schedule(resolve, 0));

  if (view.frame === undefined) return;
  await new Promise<void>((resolve) => view.rendered.push(resolve));
}

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
  releaseRendered(view);
}
