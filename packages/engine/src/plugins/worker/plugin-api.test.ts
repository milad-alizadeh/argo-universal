import { expect, it } from 'vitest';
import { fakeBridge } from '../../../mocks/plugin-bridge';
import type { PluginRequest, StorageQuery } from '../protocol/runtime';
import { createPluginApi } from './create-plugin-api';
import type { Argo } from './plugin-api';

type Answer = object | string | boolean | null | void;

type Use = (argo: Argo) => Promise<Answer>;

const query: StorageQuery = { sql: 'select 1', params: [], method: 'get' };

const calls: [string, Use, PluginRequest][] = [
  [
    'fs.read',
    ({ fs }): Promise<string> => fs.read('a.txt'),
    { api: 'fs', call: { action: 'read', path: 'a.txt' } },
  ],
  [
    'fs.write',
    ({ fs }): Promise<void> => fs.write('a.txt', 'text'),
    { api: 'fs', call: { action: 'write', path: 'a.txt', content: 'text' } },
  ],
  [
    'process.run',
    ({ process }): Promise<object> =>
      process.run(['gh', 'auth'], { cwd: '/project' }),
    {
      api: 'process',
      call: { action: 'run', argv: ['gh', 'auth'], cwd: '/project' },
    },
  ],
  [
    'fetch',
    ({ fetch }): Promise<object> =>
      fetch('https://api.github.com', { method: 'POST' }),
    { api: 'fetch', call: { url: 'https://api.github.com', method: 'POST' } },
  ],
  [
    'storage.execute',
    ({ storage }): Promise<object> => storage.execute(query),
    { api: 'storage', queries: [query] },
  ],
  [
    'projects.list',
    ({ projects }): Promise<object> => projects.list(),
    { api: 'projects', action: 'list' },
  ],
  [
    'secrets.set',
    ({ secrets }): Promise<void> => secrets.set('token', 'value'),
    {
      api: 'secrets',
      call: { action: 'set', account: 'token', value: 'value' },
    },
  ],
  [
    'settings.get',
    ({ settings }): Promise<Answer> => settings.get('greeting'),
    { api: 'settings', key: 'greeting' },
  ],
  [
    'assets.resolve',
    ({ assets }): Promise<object> => assets.resolve({ asset: 'logo.png' }),
    { api: 'assets', source: { asset: 'logo.png' } },
  ],
];

it.each(calls)(
  '%s sends its call to the Server',
  async (_name, use, request) => {
    const { bridge, requests } = fakeBridge(() => [{ rows: [] }]);

    await use(createPluginApi(bridge).argo);

    expect(requests).toEqual([request]);
  },
);

it('waits for and kills a spawned process by the id the Server gave it', async () => {
  const exited = { exitCode: 0, stdout: '', stderr: '', truncated: false };

  const { bridge, requests } = fakeBridge((request) =>
    request.api === 'process' && request.call.action === 'spawn'
      ? 'process-1'
      : exited,
  );

  const child = await createPluginApi(bridge).argo.process.spawn(['sleep']);

  await expect(child.wait()).resolves.toEqual(exited);
  await expect(child.kill()).resolves.toBeUndefined();
  expect(requests.slice(1)).toEqual([
    { api: 'process', call: { action: 'wait', id: 'process-1' } },
    { api: 'process', call: { action: 'kill', id: 'process-1' } },
  ]);
});

it('reads a fetch response body as text and JSON', async () => {
  const { bridge } = fakeBridge(() => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    body: '{"open":3}',
    truncated: false,
  }));

  const response = await createPluginApi(bridge).argo.fetch('https://x.test');

  expect(Object.isFrozen(response.headers)).toBe(true);
  await expect(response.text()).resolves.toBe('{"open":3}');
  await expect(response.json()).resolves.toEqual({ open: 3 });
});

it('answers a missing secret or setting with null', async () => {
  const { argo } = createPluginApi(fakeBridge().bridge);

  await expect(argo.secrets.get('token')).resolves.toBeNull();
  await expect(argo.settings.get('greeting')).resolves.toBeNull();
});

it('rejects a call the Server refused with the Server message', async () => {
  const { argo } = createPluginApi(async () => {
    throw new Error('refused argo.fs.read /etc/hosts');
  });

  await expect(argo.fs.read('/etc/hosts')).rejects.toThrow(
    'refused argo.fs.read /etc/hosts',
  );
});
