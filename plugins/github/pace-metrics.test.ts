import { expect, it } from 'vitest';
import { dayMs, summarize, weekStart, days } from './pace-metrics';

it('counts boundary durations once and excludes both neighboring weeks', () => {
  const start = weekStart(Date.parse('2026-11-18T22:45Z'));
  const minutes = [0, 30, 120, 360, 1440];

  const merges = minutes.map((duration, index) => ({
    number: index + 1,
    title: 'Change',
    author: 'dev',
    merged: start + index * dayMs,
    opened: start + index * dayMs - duration * 60000,
  }));

  const first = {
    number: 0,
    title: 'Neighbor',
    author: 'dev',
    opened: start,
    merged: start,
  };

  const rows = [
    ...merges,
    { ...first, merged: start - 1 },
    { ...first, merged: start + days * dayMs },
  ];

  const week = summarize(rows, start, 'dev');
  expect(week.bins).toEqual([1, 1, 1, 1, 1]);
  expect(week.points.map((p) => p.y)).toEqual([1, 2, 3, 4, 5, 5, 5]);
  expect(week).toMatchObject({
    total: 5,
    own: 5,
    median: 120,
    p90: 1440,
    average: 390,
  });
  expect(summarize(merges.slice(0, 2), start, 'someone')).toMatchObject({
    median: 15,
    own: 0,
  });
  expect(summarize([], start, 'dev')).toMatchObject({
    total: 0,
    average: null,
    median: null,
    p90: null,
  });
});

it('pairs the earliest and latest merge in a capability within the selected week', () => {
  const start = weekStart(Date.parse('2026-11-18T22:45Z'));

  const titles = [
    'feat(feed): Open a thread',
    'Show the Workbench',
    'feat(feed): Add filters',
    'feat(feed): Pin threads',
  ];

  const merges = titles.map((title, index) => ({
    title,
    number: index + 1,
    author: 'dev',
    opened: start,
    merged: start + index * dayMs,
  }));

  const week = summarize(merges, start, 'dev');
  expect(week.lanes).toMatchObject([
    { name: 'feed', first: { number: 1 }, last: { number: 4 } },
  ]);
  expect(summarize(merges.slice(0, 2), start, 'dev').lanes).toEqual([]);
});
