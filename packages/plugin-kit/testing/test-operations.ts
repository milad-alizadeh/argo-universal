import { currentPluginSurface } from '@repo/contracts/plugins/kit';
import {
  type Asking,
  LoaderPages,
  PluginOperationService,
  type PluginRuntime,
  type PluginService,
} from '@repo/engine/plugins';
import type { PageServer, TestApp } from './page-server';
import { PageView } from './page-view';
import type { PluginTest } from './test-types';

type Operations = PluginTest['operations'];

type Hosted = { service: PluginService; runtime: PluginRuntime };

type RunInput = Parameters<Operations['run']>[0];

type Run = Parameters<PluginOperationService['run']>[0];

/*
 * One run of one of the Plugin's own Operations, as an Agent's `argo run` would (ADR-0044). The test
 * names the Operation; its Plugin, params and caller default to the Plugin under test and no Session.
 */
export function testOperations(
  { service, runtime }: Hosted,
  pluginId: string,
): Operations {
  const operations = new PluginOperationService(service, runtime.operations);

  return {
    list: () => operations.rows(),
    run: (input) => operations.run(runInput(input, pluginId)),
  };
}

/*
 * A draw or a run asks as the platform's App on a paired device does; `serverDevice` asks as the App on the
 * Server Device, where a Plugin may sign in.
 */
const appOn = ({ platform, serverDevice = false }: TestApp): Asking => ({
  surface: currentPluginSurface(platform),
  identity: serverDevice
    ? { serverDevice: true }
    : { serverDevice: false, deviceId: 'paired-device' },
});

// The web App, on the Server Device when the test asks for it.
const webApp = (serverDevice?: boolean): TestApp => ({
  platform: 'web',
  serverDevice,
});

// The Plugin's draws and runs, as a page view asks the Server for them.
const pageServer = (pages: LoaderPages, pluginId: string): PageServer => ({
  draw: (request, app) => pages.draw({ pluginId, ...request }, appOn(app)),
  run: (run, app) => pages.run({ pluginId, ...run }, appOn(app)),
});

// One Server's Loader pages for the test's life, so a draw can answer against a tree it sent before.
export function testPages(
  { service, runtime }: Hosted,
  pluginId: string,
): PluginTest['pages'] {
  const operations = new PluginOperationService(service, runtime.operations);
  const pages = new LoaderPages(service, runtime.draws, operations);
  const server = pageServer(pages, pluginId);

  return {
    draw: firstPages(server),
    open: (opening) => PageView.open(server, opening),
    run: pageRuns(server),
    stale: (signal) => pages.stale(signal),
    live: livePages(pages, pluginId),
  };
}

// An Operation run from a page, on the web App.
const pageRuns =
  (server: PageServer): PluginTest['pages']['run'] =>
  ({ serverDevice, ...input }) =>
    server.run(input, webApp(serverDevice));

// A draw of the first page, empty Page state, on the web unless the test names a platform.
const firstPages =
  (server: PageServer): PluginTest['pages']['draw'] =>
  ({ platform = 'web', serverDevice, ...input }) =>
    server.draw(
      { pageState: {}, pages: 1, ...input },
      { platform, serverDevice },
    );

// A live page followed as the web App follows it, until the signal ends it.
const livePages =
  (pages: LoaderPages, pluginId: string): PluginTest['pages']['live'] =>
  ({ serverDevice, ...input }, signal) =>
    pages.live(
      { pluginId, pageState: {}, ...input },
      { ...appOn(webApp(serverDevice)), signal },
    );

const runInput = (input: RunInput, fallbackId: string): Run => ({
  ...givenToRun(input),
  pluginId: input.pluginId ?? fallbackId,
  name: input.name,
});

// A run with no params and no caller is the user's own, against the Plugin under test.
const givenToRun = ({
  params,
  caller,
}: RunInput): Pick<Run, 'params' | 'caller'> => ({
  params: params ?? {},
  caller: caller ?? {},
});
