import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { draftStateIds } from '@repo/contracts/plugins/drafts';
import { expect, it } from 'vitest';
import {
  fixture,
  manifestFile,
  readManifest,
  run,
  runShip,
} from '../mocks/plugin-cli';

const source = (headerTabs: string, defaults = true, extra = ''): string => `
import { Stack, Svg, Text } from '@argo/plugin-kit';

const headers = {
  compact: () => <Text key="header">Compact</Text>,
  tabs: ${headerTabs},
};

${extra}
export function register(argo) {
  argo.pages.define('/', {
    ${defaults ? "state: { 'draftVariant.header': 'compact' }," : ''}
    load: ({ state }) => ({ header: state['draftVariant.header'] }),
    render: ({ header }) => <Stack direction="column" key="page">{headers[header]()}</Stack>,
  });
}
`;

// How the diagnostic names the Variant that does not render.
const tabsDiagnostic = 'Variant tabs of region header';

const drafts = [
  {
    page: '/',
    states: draftStateIds,
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

async function draftPlugin(
  headerTabs: string,
  options: { defaults?: boolean; extra?: string } = {},
): Promise<string> {
  const directory = await fixture(
    source(headerTabs, options.defaults, options.extra),
  );

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

const tabsRender = '() => <Text key="header">Tabs</Text>';

const validate = (directory: string): ReturnType<typeof run> =>
  run('validate', directory, 60_000);

it('validate passes a Draft whose every Variant renders', async () => {
  const directory = await draftPlugin(tabsRender);

  expect(await validate(directory)).toMatchObject({ code: 0 });
}, 90_000);

it('validate refuses a Variant whose render throws, naming the page, region and Variant', async () => {
  const directory = await draftPlugin(
    "() => { throw new Error('no tabs yet'); }",
  );

  const result = await validate(directory);

  expect(result.code).toBe(1);
  expect(result.output).toContain(tabsDiagnostic);
  expect(result.output).toContain('no tabs yet');
  expect(result.output).not.toContain('Variant compact');
}, 90_000);

it('validate refuses a Variant whose region the kit refused to draw', async () => {
  const directory = await draftPlugin(
    // Built at run time, so only drawing it shows the kit refuses it.
    '() => <Svg key="header" label="Art" xml={`<svg><${"script"}/></svg>`} />',
  );

  const result = await validate(directory);

  expect(result.code).toBe(1);
  expect(result.output).toContain(tabsDiagnostic);
  expect(result.output).toContain('draws no node keyed header');
}, 90_000);

// The Server keeps a Page state key a page declares no default for, so a Loader that omits one still gets the pick.
it('validate draws the picked Variant for a Loader that declares no default for the key', async () => {
  const directory = await draftPlugin(
    "() => { throw new Error('tabs reached the Loader'); }",
    { defaults: false },
  );

  const result = await validate(directory);

  expect(result.code).toBe(1);
  expect(result.output).toContain(tabsDiagnostic);
  expect(result.output).toContain('tabs reached the Loader');
}, 90_000);

it('validate draws no Variant while the Plugin has source diagnostics, so only those are reported', async () => {
  const directory = await draftPlugin('() => <Text key="header">Tabs</Text>', {
    extra: 'process.cwd();',
  });

  const result = await validate(directory);

  expect(result.code).toBe(1);
  expect(result.output).toContain('index.tsx');
  expect(result.output).not.toContain(tabsDiagnostic);
}, 90_000);

it('validate passes a Plugin mid-Draft and reports its leftover Variants as blocking a ship', async () => {
  const directory = await draftPlugin(tabsRender);

  const result = await validate(directory);

  expect(result.code).toBe(0);
  expect(result.output).toContain('Plugin is valid');
  expect(result.output).toContain('Ship blocked');
  expect(result.output).toContain('region header still declares 2 Variants');
}, 90_000);

it('validate --ship fails while a Variant declaration remains', async () => {
  const directory = await draftPlugin(tabsRender);

  const result = await runShip(directory, 60_000);

  expect(result.code).toBe(1);
  expect(result.output).toContain('plugin.json');
  expect(result.output).toContain('region header still declares 2 Variants');
}, 90_000);

it('validate --ship passes a Plugin whose Variants are gone', async () => {
  const directory = await draftPlugin(tabsRender);
  const manifest = await readManifest(directory);

  await writeFile(
    join(directory, manifestFile),
    JSON.stringify({
      ...manifest,
      contributes: { ...manifest.contributes, drafts: undefined },
    }),
  );

  const result = await runShip(directory, 60_000);

  expect(result).toMatchObject({ code: 0 });
  expect(result.output).not.toContain('Ship blocked');
}, 90_000);
