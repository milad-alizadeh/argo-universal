import { reportFailure } from './host-config';
import type { OpenView } from './page-view';

const frameMs = 16;

export function schedulePage(view: OpenView, commit: () => void): void {
  if (view.frame !== undefined) return;
  view.frame = setTimeout(() => {
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
