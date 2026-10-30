import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { currentPluginSurface } from '@repo/contracts/plugins/kit';
import { onTestFinished } from 'vitest';
import { z } from 'zod';
import type { OAuthOptions } from '../src/plugins';
import { PluginTestClock } from '../src/plugins/worker/test-clock';
import { startEngineTestHost } from './engine';
import { startPluginRuntime } from './plugin-runtime-host';
import { installed, probeResult, probeSource } from './probe-plugin';

const calls = {
  start: 'argo.oauth.start()',
  wait: "argo.oauth.await('unissued', 'https://authorize.example/')",
};

export async function viewlessOAuth(): Promise<{
  opened: string[];
  result: Awaited<ReturnType<typeof probeResult>>;
}> {
  const fixture = await installed(probeSource(calls));
  const browser = recordBrowser();

  const host = await startEngineTestHost({
    home: fixture.home,
    pluginClock: new PluginTestClock(0),
    pluginOAuth: browser.oauth,
  });

  await host.caller.plugin.activate({ pluginId: 'probe' });

  return { opened: browser.opened, result: await probeResult(fixture.data) };
}

export async function overlappingOAuth(): Promise<{
  opened: string[];
  result: (server: boolean) => Promise<Json>;
}> {
  const fixture = await installed(originSource);
  const browser = recordBrowser();

  const runtime = originRuntime(fixture.home, browser.oauth);

  await activateOrigin(runtime, fixture.code);
  await openOrigins(runtime);

  return {
    opened: browser.opened,
    result: (server) => originResult(fixture.data, server),
  };
}

const originRuntime = (
  home: string,
  oauth: OAuthOptions,
): ReturnType<typeof startPluginRuntime> =>
  startPluginRuntime(home, { clock: new PluginTestClock(0), oauth });

const activateOrigin = async (
  runtime: ReturnType<typeof startPluginRuntime>,
  directory: string,
): Promise<void> => {
  await runtime.activate({
    entry: { pluginId: 'probe', directory, main: 'index.mjs' },
  });
};

async function openOrigins(
  runtime: ReturnType<typeof startPluginRuntime>,
): Promise<void> {
  const controller = new AbortController();
  onTestFinished(() => controller.abort());
  await Promise.all(
    [true, false].map((serverDevice) =>
      watchOrigin(runtime, controller, serverDevice),
    ),
  );
}

const watchOrigin = async (
  runtime: ReturnType<typeof startPluginRuntime>,
  controller: AbortController,
  serverDevice: boolean,
): Promise<void> => {
  const view = runtime.views.watch(
    'probe',
    { path: '/' },
    originContext(controller, serverDevice),
  );

  await view[Symbol.asyncIterator]().next();
};

const originContext = (
  controller: AbortController,
  serverDevice: boolean,
): Parameters<ReturnType<typeof startPluginRuntime>['views']['watch']>[2] => ({
  id: randomUUID(),
  signal: controller.signal,
  surface: currentPluginSurface('web'),
  serverDevice,
});

type Browser = { opened: string[]; oauth: OAuthOptions };

const recordBrowser = (): Browser => {
  const opened: string[] = [];

  return {
    opened,
    oauth: {
      open: async (url: string): Promise<void> => {
        opened.push(url);
      },
    },
  };
};

const originResult = async (
  directory: string,
  server: boolean,
): Promise<Json> =>
  readFile(`${directory}/${server}.json`, 'utf8').then(
    (text) => z.json().parse(JSON.parse(text)),
    () => null,
  );

const originSource = `
  import { Text, useEffect } from '@argo/plugin-kit';
  import { jsx } from '@argo/plugin-kit/jsx-runtime';
  export function register(argo) {
    argo.pages.register('/', ({context}) => {
      useEffect(() => { (async () => {
        const tag = String(context.serverDevice);
        await argo.fs.write('$DATA/before-' + tag, 'await boundary');
        const result = {};
        for (const [name, call] of Object.entries({
          start: () => argo.oauth.start().then(value => Boolean(value)),
          wait: () => argo.oauth.await('unissued', 'https://authorize.example/'),
        })) result[name] = await call().then(value => ({value}), error => ({error: error.message}));
        await argo.fs.write('$DATA/' + tag + '.json', JSON.stringify(result));
      })(); }, []);
      return jsx(Text, {children: 'Origin probe'});
    });
  }
`;
