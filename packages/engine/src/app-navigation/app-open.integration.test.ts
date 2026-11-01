import { parseScreenLink } from '@repo/contracts/navigation';
import { AppOpenResult } from '@repo/contracts/operations';
import { currentPluginSurface } from '@repo/contracts/plugins/kit';
import { expect, it, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { connectNavigationApp } from '#mocks/navigation-app';
import { operationCaller, runOperation } from '#mocks/operations';

const desktop = currentPluginSurface('desktop');

const destination = { screen: 'session', sessionId: 'session-1' } as const;

type Host = Awaited<ReturnType<typeof startEngineTestHost>>;

async function openFrom(host: Host): Promise<AppOpenResult> {
  const user = await operationCaller(host);

  const result = await runOperation(user.operations, {
    id: 'app.open',
    params: { destination },
  });

  return AppOpenResult.parse(result);
}

it('hands the destination to the one desktop App on the Server Device', async () => {
  const host = await startEngineTestHost();
  const app = connectNavigationApp(host.url, desktop);
  const { serverId } = await app.ready;

  const result = await openFrom(host);

  expect(result).toMatchObject({ status: 'delivered' });
  await vi.waitFor(() => expect(app.opened).toEqual([destination]));
  expect(parseScreenLink(result.link)).toEqual({
    ok: true,
    serverId,
    destination,
  });
});

it('answers not_opened with the link when no App is connected, and starts none', async () => {
  const host = await startEngineTestHost();

  const result = await openFrom(host);

  expect(result).toMatchObject({ status: 'not_opened' });
  expect(parseScreenLink(result.link)).toMatchObject({
    ok: true,
    destination,
  });
});

it('does not send to an App that is not a desktop App', async () => {
  const host = await startEngineTestHost();

  for (const platform of ['web', 'ios', 'android'] as const) {
    const app = connectNavigationApp(host.url, currentPluginSurface(platform));
    await app.ready;
  }

  const unreported = connectNavigationApp(host.url, {});
  await unreported.ready;

  expect(await openFrom(host)).toMatchObject({ status: 'not_opened' });
  expect(unreported.opened).toEqual([]);
});

it('sends to at most one of several desktop Connections', async () => {
  const host = await startEngineTestHost();
  const apps = [1, 2, 3].map(() => connectNavigationApp(host.url, desktop));
  await Promise.all(apps.map((app) => app.ready));

  await openFrom(host);
  await vi.waitFor(() =>
    expect(apps.flatMap((app) => app.opened)).toHaveLength(1),
  );
  await openFrom(host);
  await vi.waitFor(() =>
    expect(apps.flatMap((app) => app.opened)).toHaveLength(2),
  );
});

it('no longer counts a Connection that has closed', async () => {
  const host = await startEngineTestHost();
  const app = connectNavigationApp(host.url, desktop);
  await app.ready;
  await app.close();

  await vi.waitFor(async () =>
    expect(await openFrom(host)).toMatchObject({ status: 'not_opened' }),
  );
});

it('tells an App which Server it is connected to', async () => {
  const host = await startEngineTestHost();
  const app = connectNavigationApp(host.url, desktop);
  const { serverId } = await app.ready;

  await expect(app.client.navigation.server.query()).resolves.toEqual({
    serverId,
  });
});

it('refuses a destination that is not a typed Screen and sends nothing', async () => {
  const host = await startEngineTestHost();
  const app = connectNavigationApp(host.url, desktop);
  await app.ready;
  const user = await operationCaller(host);

  await expect(
    runOperation(user.operations, {
      id: 'app.open',
      params: { destination: { screen: 'route', href: '/settings' } },
    }),
  ).rejects.toThrow(/destination/);
  expect(app.opened).toEqual([]);
});
