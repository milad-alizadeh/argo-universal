import { PluginManifest } from '@repo/contracts/plugins';
import { expect, it } from 'vitest';
import {
  inspectDraftLoaders,
  missingStateDiagnostics,
  shipBlockerDiagnostics,
} from './drafts';

const manifest = PluginManifest.parse({
  id: 'drafts',
  name: 'Drafts',
  version: '1.0.0',
  engines: { argo: '>=0.0.0' },
  main: 'index.js',
  icon: { material: 'extension' },
  capabilities: [],
  contributes: {
    nav: [],
    drafts: [{ page: '/', states: ['loading', 'populated'] }],
  },
});

const inspect = (source: string): string[] =>
  inspectDraftLoaders({ file: 'index.js', source }, manifest).map(
    ({ line, message }) => `${line}: ${message}`,
  );

const manifestFile = 'plugin.json';

const inputRead = 'input.read';

const page = (load: string, before = ''): string =>
  `${before}\nexport function register(argo) {\n  argo.pages.define('/', { load: ${load}, render: () => null });\n}`;

it('lists the minimum states a Draft page lacks, at its states in plugin.json', () => {
  const source = JSON.stringify(manifest, null, 2);

  const diagnostics = missingStateDiagnostics(
    { file: manifestFile, source },
    manifest,
  );

  expect(diagnostics).toEqual([
    expect.objectContaining({
      file: manifestFile,
      line: source.slice(0, source.indexOf('"states"')).split('\n').length,
      message:
        'Draft page / is missing states: empty, error, signed-out, pending',
    }),
  ]);
});

it('accepts a Draft page that declares every minimum state', () => {
  const complete = PluginManifest.parse({
    ...manifest,
    contributes: {
      nav: [],
      drafts: [
        {
          page: '/',
          states: [
            'loading',
            'empty',
            'error',
            'signed-out',
            'pending',
            'populated',
          ],
        },
      ],
    },
  });

  expect(
    missingStateDiagnostics(
      { file: manifestFile, source: JSON.stringify(complete) },
      complete,
    ),
  ).toEqual([]);
});

it('accepts a Draft Loader that answers canned data', () => {
  expect(inspect(page("({ state }) => ({ title: 'Canned', state })"))).toEqual(
    [],
  );
});

it.each([
  [
    'an argo read',
    "async () => argo.queries.read('issues')",
    'argo.queries.read',
  ],
  ['an argo fetch', "async () => argo.fetch('https://x.test')", 'argo.fetch'],
  ['the input read', `async (input) => ${inputRead}(issues)`, inputRead],
  ['a destructured read', 'async ({ read }) => read(issues)', 'read'],
  [
    'a same-file helper that reads',
    'async (input) => answer(input)',
    inputRead,
    'async function answer(input) { return input.read(issues); }',
  ],
  [
    'a helper that is passed the read',
    'async ({ read }) => answer(read)',
    'fetchIssues',
    'async function answer(fetchIssues) { return fetchIssues(issues); }',
  ],
])('refuses a Draft Loader calling %s', (...row) => {
  const [, load, called, before = ''] = row;
  const [message] = inspect(page(load, before));

  expect(message).toContain('Draft Loader');
  expect(message).toContain(called);
});

it('refuses a Draft Loader named by a same-file binding', () => {
  expect(
    inspect(
      page('loadDraft', 'const loadDraft = (input) => input.read(issues);'),
    ),
  ).toEqual([expect.stringContaining(inputRead)]);
});

it('leaves the real page of the same Plugin alone', () => {
  const source = `export function register(argo) {
  argo.pages.define('/real', { load: ({ read }) => read(issues), render: () => null });
  argo.pages.define('/', { load: () => ({}), render: () => null });
}`;

  expect(inspect(source)).toEqual([]);
});

const withRegions = PluginManifest.parse({
  ...manifest,
  contributes: {
    nav: [],
    drafts: [
      {
        page: '/',
        states: ['loading'],
        regions: [
          {
            id: 'header',
            variants: [
              { id: 'compact', name: 'Compact' },
              { id: 'tabs', name: 'Tabs' },
            ],
          },
          { id: 'rows', variants: [{ id: 'dense', name: 'Dense' }] },
        ],
      },
    ],
  },
});

it('names each region that still declares Variants as a ship blocker, at its variants in plugin.json', () => {
  const source = JSON.stringify(withRegions, null, 2);

  const blockers = shipBlockerDiagnostics(
    { file: manifestFile, source },
    withRegions,
  );

  expect(blockers).toEqual([
    expect.objectContaining({
      file: manifestFile,
      line: source.slice(0, source.indexOf('"variants"')).split('\n').length,
      message: expect.stringContaining(
        'region header still declares 2 Variants',
      ),
    }),
    expect.objectContaining({
      message: expect.stringContaining('region rows still declares 1 Variant:'),
    }),
  ]);
});

it('blocks nothing once no Variant remains', () => {
  expect(
    shipBlockerDiagnostics(
      { file: manifestFile, source: JSON.stringify(manifest) },
      manifest,
    ),
  ).toEqual([]);
});
