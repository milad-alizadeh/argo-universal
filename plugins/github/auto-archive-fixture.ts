import { automationOf, tap as tapAutomation } from './auto-merge-fixture';
import type { Journey } from './journey-fixture';
import { changePull } from './journey-watch-fixture';
import type { AutomationState } from './pull-automation';

export const archiveOffer = async (run: Journey): Promise<AutomationState> =>
  (await automationOf(run)).archive;

// A person ticks or unticks Auto-archive on pull request 12.
export const tapArchive = (
  run: Journey,
  on: boolean,
): ReturnType<typeof tapAutomation> =>
  tapAutomation(run, { kind: 'archive', on });

export const outcomes = ['merged', 'closed'] as const;

// GitHub says a pull request ended: merged, or closed without merging.
export const end = (
  run: Journey,
  number: number,
  how: (typeof outcomes)[number],
): void => {
  changePull(run, number, {
    state: 'closed',
    ...(how === 'merged' && { merged: true }),
  });
};
