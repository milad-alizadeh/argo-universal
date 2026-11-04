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

// An Operation that takes no arguments and needs no Project or Session.
const startTimer = {
  name: 'startTimer',
  label: 'Start timer',
  description: 'Starts a timer.',
  tier: 'act',
  params: {},
  caller: [],
};

async function start(
  source: string,
  operations: (typeof startTimer)[] = [],
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
        operations,
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
    [startTimer],
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
