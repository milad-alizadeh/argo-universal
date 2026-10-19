import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import {
  hookEvents,
  type HookEventName,
  type PluginSettingValue,
} from '@repo/contracts/plugins';
import { JsonObject, type Json } from '@repo/contracts/plugins/hook-protocol';
import { slotPath, type PluginSlotInput } from '@repo/contracts/plugins/wire';
import {
  PluginService,
  PluginStorage,
  type PluginRuntime,
} from '@repo/engine/plugins';
import { configureTest, runtimeFor } from './test-runtime';
import type { PluginTest, PluginTestOptions } from './test-types';
import { PluginTestView, type PluginMount } from './view';

export type { PluginTest, PluginTestOptions } from './test-types';

type MountedView = { view: PluginTestView; path: string };

// Starts the production loader, host, worker and SQLite without the composed Engine or an App.
export async function startPluginTest(
  options: PluginTestOptions,
): Promise<PluginTest> {
  const configured = await configureTest(options);
  const home = await mkdtemp(join(tmpdir(), 'argo-plugin-test-'));

  return new HostedPlugin(home, configured);
}

class HostedPlugin implements PluginTest {
  private readonly runtime: PluginRuntime;
  private readonly service: PluginService;
  private readonly data: PluginStorage;
  private readonly views = new Set<PluginTestView>();
  readonly session = {
    id: 'test-session',
    projectId: 'test-project',
    agent: 'test-agent',
  };
  readonly clock = {
    advance: (ms: number): Promise<void> =>
      this.runtime.advanceClock(this.options.pluginId, ms),
  };
  readonly storage = {
    execute: (
      queries: Parameters<PluginStorage['execute']>[1],
    ): ReturnType<PluginStorage['execute']> =>
      this.data.execute(this.options.pluginId, queries),
  };

  public constructor(
    private readonly home: string,
    private readonly options: PluginTestOptions,
  ) {
    this.runtime = runtimeFor(home, options);
    this.data = new PluginStorage(home);
    this.service = new PluginService({
      home,
      version: options.version,
      firstPartyPluginsDirectory: resolve(options.directory),
      pluginRuntime: this.runtime,
    });
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
    await this.activate();

    const offset = (await this.log()).length;
    const { view, path } = this.mountView(input);
    await view.ready();
    await this.requireAccepted({ offset, path });

    return view;
  };

  private mountView(input: PluginMount): MountedView {
    const opening =
      'page' in input
        ? { path: input.page }
        : { path: slotPath(input.slot), slot: input.slot };

    const view = new PluginTestView(this.service, this.options.pluginId, {
      ...opening,
      surface: input.surface,
    });

    this.views.add(view);

    return { view, path: opening.path };
  }

  private async activate(): Promise<void> {
    const status = await this.service.activate(this.options.pluginId);

    if (status.state !== 'running')
      throw new Error(status.error ?? 'Plugin did not start');
  }

  private async requireAccepted({
    offset,
    path,
  }: {
    offset: number;
    path: string;
  }): Promise<void> {
    const refused = (await this.log())
      .slice(offset)
      .split('\n')
      .find((line) =>
        line.includes(`Plugin ${this.options.pluginId}: refused ${path}`),
      );

    if (refused) throw new Error(refused);
  }

  public log(): Promise<string> {
    return readFile(join(this.home, 'logs/plugins.log'), 'utf8');
  }

  public page(path = '/'): PluginTestView {
    return this.open(path);
  }

  public slot(slot: PluginSlotInput): PluginTestView {
    return this.open(slotPath(slot), slot);
  }

  private open(path: string, slot?: PluginSlotInput): PluginTestView {
    const view = new PluginTestView(this.service, this.options.pluginId, {
      path,
      slot,
    });

    this.views.add(view);

    return view;
  }

  public async close(): Promise<void> {
    for (const view of this.views) view.close();

    try {
      await this.runtime.close();
    } finally {
      this.data.close();
      await rm(this.home, { recursive: true, force: true });
    }
  }
}
