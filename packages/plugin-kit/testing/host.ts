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
import { itemsConnection } from './test-connection';
import { mountOpening, requireAccepted, testSession } from './test-mount';
import { testOperations } from './test-operations';
import { TestProjects } from './test-projects';
import { configureTest, runtimeFor, type ConfiguredTest } from './test-runtime';
import { serviceFor } from './test-services';
import type { PluginTest, PluginTestOptions } from './test-types';
import { PluginTestView, type Opening, type PluginMount } from './view';

export type { PluginTest, PluginTestOptions } from './test-types';

// Starts the production loader, host, worker and SQLite without the composed Engine or an App.
export async function startPluginTest(
  options: PluginTestOptions,
): Promise<PluginTest> {
  const configured = await configureTest(options);
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
  private readonly runtime: PluginRuntime;
  private readonly service: PluginService;
  readonly projects;
  private readonly views = new Set<PluginTestView>();
  readonly session = testSession;
  readonly clock = {
    advance: (ms: number): Promise<void> =>
      this.runtime.testControl.advanceClock(ms),
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
    private readonly options: ConfiguredTest,
  ) {
    this.runtime = runtimeFor(home, options);
    this.projects = new TestProjects(options, this.runtime);
    this.service = serviceFor(home, options, this.runtime);
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

  public readonly mount = async (
    input: PluginMount,
  ): Promise<PluginTestView> => {
    const pluginId = input.pluginId ?? this.options.pluginId;
    await this.activate(pluginId);

    const offset = (await this.log(pluginId)).length;

    const opening = mountOpening(input);

    const view = this.open(opening, pluginId);

    await view.ready();
    requireAccepted(await this.log(pluginId), { ...opening, offset, pluginId });

    return view;
  };

  private async activate(pluginId: string): Promise<void> {
    const status = await this.service.activate(pluginId);

    if (status.state !== 'running')
      throw new Error(status.error ?? 'Plugin did not start');
  }

  public async log(pluginId?: string): Promise<string> {
    const log = await readFile(join(this.home, 'logs/plugins.log'), 'utf8');

    return pluginId
      ? log
          .split('\n')
          .filter((line) => line.includes(`Plugin ${pluginId}:`))
          .join('\n')
      : log;
  }

  public page(
    path = '/',
    pluginId = this.options.pluginId,
    projectId?: string,
  ): PluginTestView {
    return this.open({ path, projectId }, pluginId);
  }

  public readonly slotItems: PluginTest['slotItems'] = (input, options) =>
    this.service.slotItems(input, itemsConnection(options));

  get operations(): PluginTest['operations'] {
    const { service, runtime } = this;

    return testOperations({ service, runtime }, this.options.pluginId);
  }

  private open(
    opening: Opening,
    pluginId = this.options.pluginId,
  ): PluginTestView {
    const view = new PluginTestView(this.service, pluginId, opening);

    this.views.add(view);

    return view;
  }

  public async close(): Promise<void> {
    for (const view of this.views) view.close();

    try {
      await this.runtime.close();
    } finally {
      await rm(this.home, { recursive: true, force: true });
    }
  }
}
