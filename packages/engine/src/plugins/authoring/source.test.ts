import { PluginManifest } from '@repo/contracts/plugins';
import { expect, it } from 'vitest';
import { inspectSource } from './source';

const manifest = PluginManifest.parse({
  id: 'authoring',
  name: 'Authoring',
  version: '1.0.0',
  engines: { argo: '>=0.0.0' },
  main: 'index.js',
  icon: { material: 'extension' },
  capabilities: [],
  contributes: {
    nav: [],
    hooks: ['prompt.submit', 'process.spawn'],
  },
});

it.each([
  ["api.on('unknown.event', () => {})", 'Unknown Hook event'],
  ["api.on('prompt.submit', 'matcher', () => {})", 'takes no matcher'],
  ["api.on('prompt.submit', () => {}, {guard:true})", 'guard'],
  ["api.on('process.spawn', () => {})", 'needs its Capability'],
])('reports production Hook registration refusal for %s', (body, reason) => {
  const report = inspectSource(
    { file: 'index.js', source: `export function register(api) { ${body}; }` },
    manifest,
  );

  expect(report.diagnostics).toEqual([
    expect.objectContaining({
      file: 'index.js',
      line: 1,
      message: expect.stringContaining(reason),
    }),
  ]);
});

it.each([
  '<Canvas.Rect key={id} tone="accent" width={1} height={1} />',
  '{items.map(id => <Canvas.Rect key={id} tone="accent" width={1} height={1} />)}',
  '<><Canvas.Rect key="file" tone="accent" width={1} height={1} /></>',
])('accepts Canvas children with runtime data: %s', (children) => {
  const report = inspectSource(
    {
      file: 'index.js',
      source: `import {Canvas} from '@argo/plugin-kit'; export function register(api) { api.pages.register('/', () => <Canvas label="Map" width={100} height={100} camera="fixed">${children}</Canvas>); }`,
    },
    manifest,
  );

  expect(report.diagnostics).toEqual([]);
});

it.each([
  ['argo/nowhere/v1', 'Unknown Slot'],
  ['argo/session/row/v1', 'Undeclared Slot'],
  ['argo/composer/above/v1', 'drawn through ui.render'],
])('reports registering Slot %s', (slotId, reason) => {
  const report = inspectSource(
    {
      file: 'index.js',
      source: `export function register(api) { api.slots.register('${slotId}', () => null); }`,
    },
    PluginManifest.parse({
      ...manifest,
      contributes: { nav: [], slots: ['argo/composer/above/v1'] },
    }),
  );

  expect(report.diagnostics).toEqual([
    expect.objectContaining({ message: expect.stringContaining(reason) }),
  ]);
});

it('accepts a declared add-only Slot', () => {
  const report = inspectSource(
    {
      file: 'index.js',
      source: `export function register(api) { api.slots.register('argo/project/details/v1', () => null); }`,
    },
    PluginManifest.parse({
      ...manifest,
      contributes: { nav: [], slots: ['argo/project/details/v1'] },
    }),
  );

  expect(report.diagnostics).toEqual([]);
});
