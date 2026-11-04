import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startPluginTest, type PluginTest } from '@argo/plugin-kit/testing';
import { PluginManifest } from '@repo/contracts/plugins';
import { svgCharacterLimit } from '@repo/contracts/plugins/wire-limits';
import { expect, it, onTestFinished } from 'vitest';

const fixtureDirectory = fileURLToPath(
  new URL('../mocks/plugin/', import.meta.url),
);

// An Operation that takes no arguments and needs no Project or Session.
const plainOperation = (name: string) => ({
  name,
  label: 'Start timer',
  description: 'Starts a timer.',
  tier: 'act',
  params: {},
  caller: [],
});

async function start(
  source: string,
  operations: string[] = [],
): Promise<PluginTest> {
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
        operations: operations.map(plainOperation),
        settings: [
          { key: 'prefix', type: 'text', label: 'Prefix', default: 'Test' },
        ],
      },
    }),
  );
  await writeFile(join(directory, manifest.main), source);

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
      projectId: kit.session.projectId,
      prompt: [{ type: 'text', text: 'Hello' }],
    }),
  ).toEqual({ prompt: [{ type: 'text', text: 'Changed: Hello Stored' }] });
});

it('advances the Plugin worker clock', async () => {
  const kit = await start(
    `import { Button, Stack, Text } from '@argo/plugin-kit';
    let value = 'waiting';
    export function register(argo) {
      argo.operations.register('startTimer', () => {
        setTimeout(() => { value = 'elapsed'; argo.changed(); }, 1000);
        return null;
      });
      argo.pages.define('/', {
        load: () => value,
        render: (text, to) => <Stack direction="column"><Text>{text}</Text><Button label="Start timer" onPress={to.run('startTimer', {})} /></Stack>,
      });
    }
  `,
    ['startTimer'],
  );

  const page = await kit.pages.open({ path: '/' });
  await page.press('Start timer');
  await kit.clock.advance(900);
  await page.draw();
  expect(page.find('waiting').type).toBe('Text');
  await kit.clock.advance(100);
  await page.draw();
  expect(page.find('elapsed').type).toBe('Text');
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
    xml: `<svg>${' '.repeat(svgCharacterLimit)}</svg>`,
    reason: 'character cap exceeded',
  },
])(
  'a draw drops and logs the refused Svg node: $name',
  async ({ xml, reason }) => {
    const kit = await start(`import { Svg } from '@argo/plugin-kit';
    export function register(argo) { argo.pages.define('/', { load: () => null, render: () => <Svg label="Art" xml={${JSON.stringify(xml)}} /> }); }
  `);

    const page = await kit.pages.open({ path: '/' });

    expect(page.tree.children).toEqual([]);
    expect(await kit.log()).toContain(`node Svg#0: ${reason}`);
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
  'a draw drops and logs invalid %s data through the real Plugin host',
  async (type, element, reason) => {
    const kit =
      await start(`const Chart='Chart', Canvas='Canvas', Image='Canvas.Image', Rect='Canvas.Rect', CodeMap='CodeMap';
    export function register(argo) { argo.pages.define('/', { load: () => null, render: () => ${element} }); }
  `);

    const page = await kit.pages.open({ path: '/' });
    const log = await kit.log();

    expect(page.tree.children).toEqual([]);
    expect(log).toContain(`node ${type}#`);
    expect(log).toContain(reason);
  },
  30_000,
);
