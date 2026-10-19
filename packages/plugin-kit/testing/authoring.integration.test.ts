import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startPluginTest, type PluginTest } from '@argo/plugin-kit/testing';
import { PluginManifest } from '@repo/contracts/plugins';
import { expect, it, onTestFinished } from 'vitest';

const fixtureDirectory = fileURLToPath(
  new URL('../mocks/plugin/', import.meta.url),
);

const surface = {
  platform: 'web' as const,
  parts: { Column: 1, Text: 3, Button: 3 },
};

async function start(source: string): Promise<PluginTest> {
  const directory = await mkdtemp(join(tmpdir(), 'argo-authoring-kit-'));
  onTestFinished(() => rm(directory, { recursive: true, force: true }));
  await cp(fixtureDirectory, directory, { recursive: true });

  const manifest = PluginManifest.parse(
    JSON.parse(await readFile(join(directory, 'plugin.json'), 'utf8')),
  );

  await writeFile(
    join(directory, 'plugin.json'),
    JSON.stringify({
      ...manifest,
      contributes: {
        ...manifest.contributes,
        hooks: ['prompt.submit'],
        settings: [
          { key: 'prefix', type: 'text', label: 'Prefix', default: 'Test' },
        ],
      },
    }),
  );
  await writeFile(join(directory, 'index.js'), source);

  const kit = await startPluginTest({
    directory,
    pluginId: manifest.id,
    version: '0.0.0',
    clockStart: 0,
  });

  onTestFinished(() => kit.close());

  return kit;
}

it('raises a real event through the production Hook chain with isolated storage, settings and Session data', async () => {
  const kit = await start(`export async function register(argo) {
    const stored = await argo.storage.execute({sql: 'SELECT value FROM state', params: [], method: 'all'});
    await argo.on('prompt.submit', async (ctx, event, next) => next({ ...event, prompt: [{type: 'text', text: (await argo.settings.get('prefix')) + ': ' + event.prompt[0].text + ' ' + stored.rows[0][0]}] }));
  }`);

  kit.storage.execute([
    { sql: 'CREATE TABLE state (value TEXT)', params: [], method: 'run' },
    { sql: "INSERT INTO state VALUES ('Stored')", params: [], method: 'run' },
  ]);
  kit.settings.set('prefix', 'Changed');
  expect(
    await kit.emit('prompt.submit', {
      sessionId: kit.session.id,
      prompt: [{ type: 'text', text: 'Hello' }],
    }),
  ).toEqual({ prompt: [{ type: 'text', text: 'Changed: Hello Stored' }] });
});

it('advances the Plugin worker clock', async () => {
  const kit =
    await start(`import { Stack, Text, Button, useState } from '@argo/plugin-kit';
    function Page() {
      const [value, setValue] = useState('waiting');
      return <Stack direction="column"><Text>{value}</Text><Button label="Start timer" onPress={() => setTimeout(() => setValue('elapsed'), 1000)} /></Stack>;
    }
    export function register(argo) { argo.pages.register('/', Page); }
  `);

  const page = await kit.mount({ page: '/', surface });
  await page.press('Start timer');
  await kit.clock.advance(900);
  expect((await page.find('waiting')).type).toBe('Text');
  await kit.clock.advance(100);
  expect((await page.find('elapsed')).type).toBe('Text');
});

it('draws only the chosen App wire types', async () => {
  const kit =
    await start(`import { Stack, Text, Button } from '@argo/plugin-kit';
    export function register(argo) { argo.pages.register('/', () => <Stack direction="column"><Text>Visible</Text><Button label="Unsupported" /></Stack>); }
  `);

  const limited = await kit.mount({
    page: '/',
    surface: { ...surface, parts: { Column: 1, Text: 3 } },
  });

  expect(limited.findText('Visible')).toBeDefined();
  expect(limited.findText('Unsupported')).toBeUndefined();
});

it.each([
  {
    name: 'element subset',
    xml: '<svg><script/></svg>',
    reason: 'element <script> refused',
  },
  {
    name: 'raw color',
    xml: '<svg><path fill="#ffffff"/></svg>',
    reason: 'color #ffffff refused',
  },
  {
    name: 'character cap',
    xml: `<svg>${' '.repeat(131_072)}</svg>`,
    reason: 'character cap exceeded',
  },
])(
  'mount refuses the Svg node: $name',
  async ({ xml, reason }) => {
    const kit = await start(`import { Svg } from '@argo/plugin-kit';
    export function register(argo) { argo.pages.register('/', () => <Svg label="Art" xml={${JSON.stringify(xml)}} />); }
  `);

    await expect(
      kit.mount({
        page: '/',
        surface: { ...surface, parts: { ...surface.parts, Svg: 1 } },
      }),
    ).rejects.toThrow(reason);
    expect(await kit.log()).toContain('node Svg#');
  },
  30_000,
);

it.each([
  [
    'Chart',
    '<Chart label="Data" kind="bar" series={[{ name: "Files", tone: "#fff", points: [] }]} />',
    'tone',
  ],
  [
    'Canvas',
    '<Canvas label="Map" width={10} height={10} camera="fixed"><Image key="image" /></Canvas>',
    'shape Canvas.Image refused',
  ],
  [
    'Canvas',
    '<Canvas label="Map" width={10} height={10} camera="fixed"><Rect key="rect" tone="accent" width={1} height={1} fill="#fff" /></Canvas>',
    'fill',
  ],
  ['CodeMap', '<CodeMap />', 'unsupported CodeMap'],
])(
  'mount refuses invalid %s data through the real Plugin host',
  async (type, element, reason) => {
    const kit =
      await start(`const Chart='Chart', Canvas='Canvas', Image='Canvas.Image', Rect='Canvas.Rect', CodeMap='CodeMap';
    export function register(argo) { argo.pages.register('/', () => ${element}); }
  `);

    await expect(kit.mount({ page: '/', surface })).rejects.toThrow(reason);
    expect(await kit.log()).toContain(`node ${type}#`);
  },
  30_000,
);
