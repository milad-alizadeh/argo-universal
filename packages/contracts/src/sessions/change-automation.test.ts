import { expect, it } from 'vitest';
import { Change } from './change';

const base = {
  id: 'github:owner/repository#12',
  stage: 'open',
  title: 'Add the thing',
  repository: 'owner/repository',
  pullRequest: {
    number: 12,
    url: 'https://github.com/owner/repository/pull/12',
  },
};

const automation = {
  fix: { on: false, available: false },
  merge: { on: true, available: true },
  archive: { on: false, available: false, reason: 'Not yet' },
};

it('accepts a Change with its automation', () => {
  expect(Change.parse({ ...base, automation })).toEqual({
    ...base,
    automation,
  });
});

it('accepts a Change with no automation, which offers none', () => {
  expect(Change.parse(base).automation).toBeUndefined();
});

it('refuses an automation that leaves one of the three out', () => {
  const { archive: _archive, ...two } = automation;

  expect(() => Change.parse({ ...base, automation: two })).toThrow();
});

it('refuses an automation with an unknown field', () => {
  expect(() =>
    Change.parse({
      ...base,
      automation: { ...automation, review: { on: true, available: true } },
    }),
  ).toThrow();
});
