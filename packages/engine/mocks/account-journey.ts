import { expect, onTestFinished } from 'vitest';
import type { PluginClock } from '../src/plugins';
import { PluginTestClock } from '../src/plugins/worker/test-clock';
import { accountPlugins, accountNetwork } from './account-plugins';
import { startEngineTestHost } from './engine';
import { MemoryKeychain } from './memory-keychain';
import { probeResult, registeredProject } from './probe-plugin';

type BorrowOptions = { keychain?: MemoryKeychain; clock?: PluginClock };

type EngineHost = Awaited<ReturnType<typeof startEngineTestHost>>;

type BorrowJourney = EngineHost &
  Awaited<ReturnType<typeof accountPlugins>> &
  Awaited<ReturnType<typeof accountNetwork>> & {
    keychain: MemoryKeychain;
    result: Awaited<ReturnType<typeof probeResult>>;
    projectId: string;
  };

export async function borrow(
  expression: string,
  prepare?: (host: EngineHost) => Promise<void>,
  options: BorrowOptions = {},
): Promise<BorrowJourney> {
  await registeredProject();
  const plugins = await accountPlugins(expression);
  const network = await accountNetwork();

  const keychain = options.keychain ?? new MemoryKeychain();

  const host = await startEngineTestHost({
    home: plugins.home,
    pluginNetwork: network.pluginNetwork,
    keychain,
    pluginClock: options.clock ?? new PluginTestClock(0),
  });

  await prepareProvider(host, prepare);
  const projectId = await borrowProject(host);
  await openBorrower(host, projectId);
  await expect
    .poll(() => probeResult(plugins.borrowerData).catch(() => null), {
      timeout: 10_000,
    })
    .not.toBeNull();

  return {
    ...plugins,
    ...network,
    ...host,
    keychain,
    result: await probeResult(plugins.borrowerData),
    projectId,
  };
}

async function borrowProject(host: EngineHost): Promise<string> {
  const [project] = await host.caller.projects.list();

  if (!project) throw new Error('Missing fixture Project');

  return project.id;
}

async function openBorrower(
  host: EngineHost,
  projectId: string,
): Promise<void> {
  const controller = new AbortController();

  const view = await host
    .createCaller({ signal: controller.signal })
    .plugins.view({ pluginId: 'borrower', path: '/', projectId });

  onTestFinished(() => controller.abort());
  await view[Symbol.asyncIterator]().next();
}

async function prepareProvider(
  host: EngineHost,
  prepare: ((host: EngineHost) => Promise<void>) | undefined,
): Promise<void> {
  await host.caller.plugins.activate({ pluginId: 'probe' });
  await prepare?.(host);
}
