import { reportFailure } from './host-config';
import type { OpenView } from './page-view';

const frameMs = 16;

const scheduleFrame = setTimeout;

const cancelFrame = clearTimeout;

export function schedulePage(view: OpenView, commit: () => void): void {
  if (view.frame !== undefined) return;
  view.frame = scheduleFrame(() => {
    view.frame = undefined;
    publishCommit(commit);
  }, frameMs);
}

function publishCommit(commit: () => void): void {
  try {
    commit();
  } catch (error) {
    reportFailure(error instanceof Error ? error : new Error(String(error)));
  }
}

export function cancelPageFrame(view: OpenView): void {
  cancelFrame(view.frame);
}
