import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  hookEvents,
  type HookEventName,
  type PluginSettingValue,
} from '@repo/contracts/plugins';
import { JsonObject, type Json } from '@repo/contracts/plugins/hook-protocol';
import {
  PluginService,
  PluginStorage,
  type PluginRuntime,
} from '@repo/engine/plugins';
import { PageClock } from './page-clock';
import { itemsConnection, testConnection } from './test-connection';
import { testOperations, testPages } from './test-operations';
import { TestProjects } from './test-projects';
import { configureTest } from './test-runtime';
import { secretStoreFor, type HostedTest } from './test-secret-store';
import type { PluginTest, PluginTestOptions } from './test-types';
import { wireTest, type Wiring } from './test-wiring';

export type { PluginTest, PluginTestOptions } from './test-types';

const testSession = {
  id: 'test-session',
  projectId: 'test-project',
  agent: 'test-agent',
};

// Starts the production loader, host, worker and SQLite without the composed Engine or an App.
export async function startPluginTest(
  options: PluginTestOptions,
): Promise<PluginTest> {
  const configured = await secretStoreFor(await configureTest(options));
  const home = await mkdtemp(join(tmpdir(), 'argo-plugin-test-'));
  const plugin = new HostedPlugin(home, configured);

  try {
    await plugin.startBackground();
  } catch (cause) {
    await plugin.close();
    throw cause;
  }

  return plugin;
}

class HostedPlugin implements PluginTest {
  startBackground(): Promise<void> {
    return this.service.startBackground();
  }
  readonly badges: PluginTest['badges'] = (signal) =>
    this.service.badges(signal);
  readonly failures: PluginTest['failures'] = (signal) =>
    this.service.failures(signal);
  private readonly wired: Wiring;
  readonly pages: PluginTest['pages'];
  readonly projects;
  readonly session = testSession;
  private readonly pageClock = new PageClock();
  /*
   * The open pages' edit pauses always move; the Plugin's timers move with them when the test started its clock
   * with `clockStart`.
   */
  readonly clock = {
    advance: async (ms: number): Promise<void> => {
      if (this.options.clockStart !== undefined)
        await this.runtime.testControl.advanceClock(ms);

      await this.pageClock.advance(ms);
    },
  };
  readonly storage = {
    execute: (
      queries: Parameters<PluginStorage['execute']>[1],
      pluginId = this.options.pluginId,
    ): ReturnType<PluginStorage['execute']> =>
      this.runtime.services.storage.execute(pluginId, queries),
  };

  public constructor(
    private readonly home: string,
    private readonly options: HostedTest,
  ) {
    const wired = wireTest(home, options, options.secretStore);

    this.wired = wired;
    this.projects = new TestProjects(options, wired.runtime, () =>
      wired.accountStore.syncProjects(options.projects),
    );
    this.pages = testPages(
      { service: wired.service, runtime: wired.runtime },
      options.pluginId,
      this.pageClock,
    );
  }

  private get runtime(): PluginRuntime {
    return this.wired.runtime;
  }

  private get service(): PluginService {
    return this.wired.service;
  }

  get accounts(): PluginTest['accounts'] {
    return this.wired.accountStore.accounts;
  }

  get settings(): Map<string, PluginSettingValue> {
    return this.options.settings ?? new Map();
  }

  public readonly emit = async (
    name: HookEventName,
    event: JsonObject,
  ): Promise<Json> =>
    this.service.runHooks(
      name,
      JsonObject.parse(hookEvents[name].event.parse(event)),
    );

  public async log(pluginId?: string): Promise<string> {
    const log = await readFile(join(this.home, 'logs/plugins.log'), 'utf8');

    return pluginId
      ? log
          .split('\n')
          .filter((line) => line.includes(`Plugin ${pluginId}:`))
          .join('\n')
      : log;
  }

  public readonly slotItems: PluginTest['slotItems'] = (input, options) =>
    this.service.slotItems(input, itemsConnection(options));

  public readonly render: PluginTest['render'] = (input, platform) =>
    this.service.render(
      input,
      testConnection(new AbortController().signal, {
        surface: { platform: platform ?? 'web' },
      }),
    );

  get operations(): PluginTest['operations'] {
    const { service, runtime } = this;

    return testOperations({ service, runtime }, this.options.pluginId);
  }

  public async close(): Promise<void> {
    try {
      await this.runtime.close();
    } finally {
      this.wired.accountStore.close();
      await rm(this.home, { recursive: true, force: true });
    }
  }
}
