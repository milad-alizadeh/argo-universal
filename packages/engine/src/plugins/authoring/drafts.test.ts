import { PluginManifest } from '@repo/contracts/plugins';
import { expect, it } from 'vitest';
import { missingStateDiagnostics, shipBlockerDiagnostics } from './drafts';

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

const manifestFile = 'plugin.json';

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
      line: source.slice(0, source.lastIndexOf('"variants"')).split('\n')
        .length,
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
