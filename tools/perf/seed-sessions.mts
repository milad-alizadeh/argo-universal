import type { session } from '@repo/db/schema';

export const longSessionId = 'perf-long-feed';

const titles = [
  'Fix flaky reconnect in the Connection machine',
  'Add search to the Sessions list',
  'Refactor the Feed view model',
  'Explain why the Inspector resizes',
  'Bump Expo and check the native build',
  'Write model-based tests for the drawer',
  'Port the glass sidebar to Electron',
  'Investigate slow catch-up after sleep',
];

// The title of the Session at `index` in the seeded list, which holds at least as many as the run asked for.
export const sessionTitle = (index: number): string =>
  `${titles[index % titles.length]} ${index}`;

const longSessionTitle = `${titles[0]} 0`;

export const benchmarkTitles = {
  longSessionTitle,
  shortSessionTitle: `${titles[1]} 1`,
};

export type SessionRow = typeof session.$inferSelect;

const clone = (
  template: SessionRow,
  index: number,
  now: number,
): SessionRow => ({
  ...template,
  id: `perf-session-${index}`,
  title: sessionTitle(index),
  titleSource: 'user',
  activityAt: now - index * 60_000,
  vendorSessionId: null,
});

// The long Session, which holds `revision` Feed rows, then older copies of the template.
interface CloneRequest {
  template: SessionRow;
  revision: number;
  now: number;
  count: number;
}

// One original template plus this many clones gives the requested total Session count.
export const seedSessionRows = ({
  template,
  revision,
  now,
  count,
}: CloneRequest): SessionRow[] =>
  Array.from({ length: count - 1 }, (_, index) =>
    clone(template, index, now),
  ).with(0, {
    ...clone(template, 0, now),
    id: longSessionId,
    maxRevision: revision,
    seenRevision: revision,
  });
