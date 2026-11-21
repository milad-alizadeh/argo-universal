import { expect, it } from 'vitest';
import {
  draftStateIds,
  draftStateKey,
  draftStateLabels,
  draftVariantKey,
  missingDraftStates,
} from './drafts';
import { PluginList, PluginManifest } from './plugins';

const manifest = {
  id: 'issues',
  name: 'Issues',
  version: '1.0.0',
  engines: { argo: '^1.0.0' },
  main: 'index.js',
  icon: { sf: 'list.bullet' },
  contributes: { nav: [{ id: 'issues', title: 'Issues', path: '/' }] },
};

type WithDrafts = typeof manifest & {
  contributes: { drafts: object[] };
};

const withDrafts = (drafts: object[]): WithDrafts => ({
  ...manifest,
  contributes: { ...manifest.contributes, drafts },
});

it('names the six minimum states once, each with a label', () => {
  expect(draftStateIds).toEqual([
    'loading',
    'empty',
    'error',
    'signed-out',
    'pending',
    'populated',
  ]);
  expect(Object.keys(draftStateLabels)).toEqual([...draftStateIds]);
});

it('accepts a Draft page that declares states, regions and Variants', () => {
  const parsed = PluginManifest.safeParse(
    withDrafts([
      {
        page: '/',
        states: ['loading', 'populated'],
        regions: [
          {
            id: 'header',
            variants: [
              { id: 'a', name: 'Plain' },
              { id: 'b', name: 'Tabs' },
            ],
          },
        ],
      },
    ]),
  );

  expect(parsed.success).toBe(true);
});

it('accepts a Draft with no regions yet', () => {
  expect(
    PluginManifest.safeParse(withDrafts([{ page: '/', states: ['empty'] }]))
      .success,
  ).toBe(true);
});

it.each([
  ['an unknown state', [{ page: '/', states: ['broken'] }]],
  ['no states', [{ page: '/', states: [] }]],
  ['a repeated state', [{ page: '/', states: ['empty', 'empty'] }]],
  ['an unknown key', [{ page: '/', states: ['empty'], title: 'x' }]],
  [
    'a page declared twice',
    [
      { page: '/', states: ['empty'] },
      { page: '/', states: ['loading'] },
    ],
  ],
  [
    'a repeated region',
    [
      {
        page: '/',
        states: ['empty'],
        regions: [
          { id: 'list', variants: [{ id: 'a', name: 'A' }] },
          { id: 'list', variants: [{ id: 'a', name: 'A' }] },
        ],
      },
    ],
  ],
  [
    'a repeated Variant',
    [
      {
        page: '/',
        states: ['empty'],
        regions: [
          {
            id: 'list',
            variants: [
              { id: 'a', name: 'A' },
              { id: 'a', name: 'B' },
            ],
          },
        ],
      },
    ],
  ],
])('refuses %s', (_name, drafts) => {
  expect(PluginManifest.safeParse(withDrafts(drafts)).success).toBe(false);
});

it('lists the minimum states a Draft does not declare, in minimum order', () => {
  expect(missingDraftStates(['populated', 'loading', 'error'])).toEqual([
    'empty',
    'signed-out',
    'pending',
  ]);
});

it('keeps the chosen state in Page state under one key', () => {
  expect(draftStateKey).toBe('draftState');
});

it('lists a Plugin as dev only when the Server says so', () => {
  const entry = {
    manifest,
    firstParty: true,
    enabled: true,
    state: 'not-started',
    hanging: false,
    error: null,
  };

  expect(PluginList.safeParse({ plugins: [entry], errors: [] }).success).toBe(
    true,
  );
  expect(
    PluginList.safeParse({ plugins: [{ ...entry, dev: true }], errors: [] })
      .data?.plugins[0]?.dev,
  ).toBe(true);
});

it('names the Page state key a region pick travels under, one for each region', () => {
  expect(draftVariantKey('header')).toBe('draftVariant.header');
  expect(draftVariantKey('list')).not.toBe(draftVariantKey('header'));
  expect(draftVariantKey('header')).not.toBe(draftStateKey);
});
