import { describe, expect, it } from 'vitest';
import {
  currentDraftState,
  draftChoiceRefusal,
  draftDrawPath,
  draftPageAt,
  draftRegionLabel,
  draftRegions,
  draftStateIds,
  draftStateKey,
  draftStateLabels,
  draftVariantKey,
  draftVariantDraws,
  missingDraftStates,
  shownPicks,
  shownVariant,
  steppedVariant,
  variantStep,
  type PluginDrafts,
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

const header = {
  id: 'header',
  variants: [
    { id: 'compact', name: 'Compact' },
    { id: 'search', name: 'Search' },
    { id: 'tabs', name: 'Tabs' },
  ],
};

const list = {
  id: 'list',
  variants: [
    { id: 'rows', name: 'Rows' },
    { id: 'cards', name: 'Cards' },
  ],
};

const issues: PluginDrafts = [
  { page: '/', states: ['populated'], regions: [header, list] },
  { page: '/issues/:id', states: ['loading', 'error'] },
];

it('finds the Draft page for a path, matching a pattern, and none for another path', () => {
  expect(draftPageAt(issues, '/')?.page).toBe('/');
  expect(draftPageAt(issues, '/issues/42')?.page).toBe('/issues/:id');
  expect(draftPageAt(issues, '/other')).toBeNull();
  expect(draftPageAt(undefined, '/')).toBeNull();
});

it('lists the regions a page declares, none for a page without or no page', () => {
  expect(draftRegions(issues[0] ?? null).map(({ id }) => id)).toEqual([
    'header',
    'list',
  ]);
  expect(draftRegions(issues[1] ?? null)).toEqual([]);
  expect(draftRegions(null)).toEqual([]);
});

it.each([
  ['list', 'List'],
  ['side-bar', 'Side-bar'],
  ['issue_board', 'Issue_board'],
])('labels region %s as its id capitalised, %s', (id, label) => {
  expect(draftRegionLabel(id)).toBe(label);
});

it('shows the picked Variant, and the first when nothing or a stale Variant is picked', () => {
  expect(shownVariant(header, {})).toEqual({ id: 'compact', index: 0 });
  expect(shownVariant(header, { [draftVariantKey('header')]: 'tabs' })).toEqual(
    { id: 'tabs', index: 2 },
  );
  expect(shownVariant(list, { [draftVariantKey('list')]: 'gone' })).toEqual({
    id: 'rows',
    index: 0,
  });
});

it('sends each region with the Variant it draws, and nothing for a page without regions', () => {
  expect(
    shownPicks(issues[0] ?? null, { [draftVariantKey('header')]: 'tabs' }),
  ).toEqual([
    { region: 'header', variant: 'tabs' },
    { region: 'list', variant: 'rows' },
  ]);
  expect(shownPicks(issues[1] ?? null, {})).toEqual([]);
});

it('steps a region one Variant, wrapping at both ends', () => {
  expect(steppedVariant(header, 'compact', 1)).toBe('search');
  expect(steppedVariant(header, 'tabs', 1)).toBe('compact');
  expect(steppedVariant(header, 'compact', -1)).toBe('tabs');
  expect(steppedVariant(header, 'gone', 1)).toBe('search');
});

it('changes the Page state key of the stepped region only, and refuses an undeclared region', () => {
  const page = issues[0] ?? null;

  expect(variantStep(page, {}, 'header', 1)).toEqual({
    [draftVariantKey('header')]: 'search',
  });
  expect(
    variantStep(page, { [draftVariantKey('list')]: 'cards' }, 'list', 1),
  ).toEqual({ [draftVariantKey('list')]: 'rows' });
  expect(variantStep(page, {}, 'footer', 1)).toBeNull();
  expect(variantStep(null, {}, 'header', 1)).toBeNull();
});

it('draws the chosen state, then populated, then the first declared state', () => {
  expect(
    currentDraftState(['error', 'populated'], { draftState: 'error' }),
  ).toBe('error');
  expect(currentDraftState(['error', 'populated'], {})).toBe('populated');
  expect(currentDraftState(['error', 'loading'], {})).toBe('loading');
  expect(currentDraftState(['populated'], { draftState: 'sleepy' })).toBe(
    'populated',
  );
  expect(currentDraftState(['populated'], { draftState: 'empty' })).toBe(
    'empty',
  );
});

it('draws a page pattern with a stand-in for its parameters', () => {
  expect(draftDrawPath('/issues/:id/files/:name')).toBe(
    '/issues/draft/files/draft',
  );
  expect(draftDrawPath('/')).toBe('/');
});

it('lists every Variant of every region to draw on its page', () => {
  expect(draftVariantDraws(issues)).toHaveLength(5);
  expect(draftVariantDraws(issues)[0]).toEqual({
    page: '/',
    region: 'header',
    variant: 'compact',
  });
  expect(draftVariantDraws(undefined)).toEqual([]);
});

describe('refusing a choice the Drafts do not declare', () => {
  it('accepts declared picks and comment places', () => {
    expect(
      draftChoiceRefusal(
        issues,
        [
          { region: 'header', variant: 'tabs' },
          { region: 'list', variant: 'cards' },
        ],
        [
          { nodeKey: 'row', region: 'list', variant: 'cards' },
          { nodeKey: 'title', region: 'list' },
          { nodeKey: 'footer' },
        ],
      ),
    ).toBeNull();
  });

  it('refuses a region or Variant the Drafts do not declare', () => {
    expect(
      draftChoiceRefusal(issues, [{ region: 'footer', variant: 'x' }], []),
    ).toBe('The Draft declares no region footer');
    expect(
      draftChoiceRefusal(issues, [{ region: 'header', variant: 'x' }], []),
    ).toBe('Region header declares no Variant x');
    expect(
      draftChoiceRefusal(
        issues,
        [],
        [{ nodeKey: 'row', region: 'list', variant: 'x' }],
      ),
    ).toBe('Region list declares no Variant x');
    expect(
      draftChoiceRefusal(issues, [], [{ nodeKey: 'row', variant: 'cards' }]),
    ).toBe('Comment on row names Variant cards without a region');
  });

  it('refuses every pick of a Plugin that declares no Drafts', () => {
    expect(
      draftChoiceRefusal(undefined, [{ region: 'header', variant: 'a' }], []),
    ).toBe('The Draft declares no region header');
    expect(draftChoiceRefusal(undefined, [], [])).toBeNull();
  });

  describe('when two Draft pages reuse a region id', () => {
    const reused: PluginDrafts = [
      {
        page: '/',
        states: ['populated'],
        regions: [{ id: 'header', variants: [{ id: 'compact', name: 'C' }] }],
      },
      {
        page: '/other',
        states: ['populated'],
        regions: [{ id: 'header', variants: [{ id: 'tabs', name: 'T' }] }],
      },
    ];

    it('accepts a valid pick on either page', () => {
      expect(
        draftChoiceRefusal(reused, [{ region: 'header', variant: 'tabs' }], []),
      ).toBeNull();
      expect(
        draftChoiceRefusal(
          reused,
          [{ region: 'header', variant: 'compact' }],
          [],
        ),
      ).toBeNull();
    });

    it('accepts a comment on the second page, and refuses a Variant neither declares', () => {
      expect(
        draftChoiceRefusal(
          reused,
          [],
          [{ nodeKey: 'row', region: 'header', variant: 'tabs' }],
        ),
      ).toBeNull();
      expect(
        draftChoiceRefusal(reused, [{ region: 'header', variant: 'x' }], []),
      ).toBe('Region header declares no Variant x');
    });
  });
});
