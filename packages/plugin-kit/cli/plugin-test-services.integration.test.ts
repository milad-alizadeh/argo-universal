import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it, onTestFinished } from 'vitest';
import { runPluginCommand } from './plugin-command';

const here = fileURLToPath(new URL('.', import.meta.url));

// A Plugin test in the Plugin's own folder: the services it names stand in for the Plugin's service, so no test reaches a real one.
const signedInTest = `import assert from 'node:assert/strict';
import { test } from '@argo/plugin-kit/testing';

const services = ({ host, path }) => {
  if (path === '/device')
    return { json: { device_code: 'd', user_code: 'WDJB-MJHT', verification_uri: 'https://auth.service.example/activate', interval: 1, expires_in: 900 } };
  if (host.startsWith('auth.')) return { json: { access_token: 'token-1' } };
  if (path === '/me') return { json: { login: 'person' } };

  return { text: 'the items' };
};

test('after sign-in the items draw', async (kit, requests) => {
  const signIn = await kit.pages.open({ path: '/sign-in', projectId: kit.session.projectId });

  await signIn.press('Sign in to Service');

  for (let step = 0; step < 5; step += 1) {
    await kit.clock.advance(1000);
    await signIn.draw();
  }

  const items = await kit.pages.open({ path: '/', projectId: kit.session.projectId });

  assert.ok(items.findText('the items'));
  assert.ok(requests.some(({ path }) => path === '/items'));
}, { services });
`;

async function pluginWithTest(): Promise<string> {
  const directory = await mkdtemp(join(here, '..', 'mocks', 'with-services-'));
  onTestFinished(() => rm(directory, { recursive: true, force: true }));
  await cp(join(here, '..', 'mocks', 'sign-in-plugins', 'device'), directory, {
    recursive: true,
  });
  await writeFile(join(directory, 'index.test.ts'), signedInTest);

  return directory;
}

it('runs a Plugin test against the services it names, for a Project, with no real network', async () => {
  const directory = await pluginWithTest();
  const lines: string[] = [];

  const code = await runPluginCommand(
    ['test', directory],
    (line) => lines.push(line),
    'argo-plugin',
  );

  expect(lines.join('\n')).toContain('PASS after sign-in the items draw');
  expect(code).toBe(0);
}, 60_000);
