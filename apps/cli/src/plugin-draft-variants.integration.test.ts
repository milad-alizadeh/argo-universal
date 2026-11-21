import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { fixture, manifestFile, readManifest, run } from '../mocks/plugin-cli';

const source = (headerTabs: string): string => `
import { Stack, Svg, Text } from '@argo/plugin-kit';

const headers = {
  compact: () => <Text key="header">Compact</Text>,
  tabs: ${headerTabs},
};

export function register(argo) {
  argo.pages.define('/', {
    state: { 'draftVariant.header': 'compact' },
    load: ({ state }) => ({ header: state['draftVariant.header'] }),
    render: ({ header }) => <Stack direction="column" key="page">{headers[header]()}</Stack>,
  });
}
`;

const drafts = [
  {
    page: '/',
    states: ['populated'],
    regions: [
      {
        id: 'header',
        variants: [
          { id: 'compact', name: 'Compact' },
          { id: 'tabs', name: 'Tabs' },
        ],
      },
    ],
  },
];

async function draftPlugin(headerTabs: string): Promise<string> {
  const directory = await fixture(source(headerTabs));
  const manifest = await readManifest(directory);

  await writeFile(
    join(directory, manifestFile),
    JSON.stringify({
      ...manifest,
      capabilities: [],
      contributes: {
        nav: [{ id: 'draft', title: 'Draft', path: '/' }],
        drafts,
      },
    }),
  );

  // The template's types are for Operations this fixture no longer declares.
  await rm(join(directory, 'plugin.gen.d.ts'), { force: true });

  return directory;
}

it('validate passes a Draft whose every Variant renders', async () => {
  const directory = await draftPlugin('() => <Text key="header">Tabs</Text>');

  expect(await run('validate', directory, 60_000)).toMatchObject({ code: 0 });
}, 90_000);

it('validate refuses a Variant whose render throws, naming the page, region and Variant', async () => {
  const directory = await draftPlugin(
    "() => { throw new Error('no tabs yet'); }",
  );

  const result = await run('validate', directory, 60_000);

  expect(result.code).toBe(1);
  expect(result.output).toContain('Variant tabs of region header');
  expect(result.output).toContain('no tabs yet');
  expect(result.output).not.toContain('Variant compact');
}, 90_000);

it('validate refuses a Variant whose region the kit refused to draw', async () => {
  const directory = await draftPlugin(
    // Built at run time, so only drawing it shows the kit refuses it.
    '() => <Svg key="header" label="Art" xml={`<svg><${"script"}/></svg>`} />',
  );

  const result = await run('validate', directory, 60_000);

  expect(result.code).toBe(1);
  expect(result.output).toContain('Variant tabs of region header');
  expect(result.output).toContain('draws no node keyed header');
}, 90_000);
