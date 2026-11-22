import type { SessionRuns } from '#features/sessions';
import { idleSession } from './session-detail-view.mocks';
import { runActions } from './session-run-inspector-fixtures';

const noRuns = { ...runActions, runs: [] } satisfies SessionRuns;

export const draftUnavailable = {
  content: { ...idleSession, runs: noRuns },
  message: 'No sources in Checkout.',
};
