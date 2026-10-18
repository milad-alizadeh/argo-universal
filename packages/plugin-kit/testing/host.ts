import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, resolve, join } from 'node:path';
import type { PluginProjectInfo } from '@repo/contracts/plugins';
import { slotPath, type PluginSlotInput } from '@repo/contracts/plugins/wire';
import { MemoryKeychain } from '@repo/engine/mocks/keychain';
import {
  createPluginRuntime,
  PluginService,
  type PluginRuntime,
} from '@repo/engine/plugins';
import { PluginTestView } from './view';

export interface PluginTestOptions {
  directory: string;
  pluginId: string;
  version: string;
  projects?: PluginProjectInfo[];
  // Folders containing external executable fixtures, prepended only for this runtime.
  path?: string[];
}

export interface PluginTest {
  log: () => Promise<string>;
  page: (path?: string) => PluginTestView;
  slot: (slot: PluginSlotInput) => PluginTestView;
  close: () => Promise<void>;
}

// Starts the production loader, host, worker and SQLite without the composed Engine or an App.
export async function startPluginTest(
  options: PluginTestOptions,
): Promise<PluginTest> {
  const home = await mkdtemp(join(tmpdir(), 'argo-plugin-test-'));

  return new HostedPlugin(home, options);
}

class HostedPlugin implements PluginTest {
  private readonly runtime: PluginRuntime;
  private readonly service: PluginService;
  private readonly views = new Set<PluginTestView>();

  constructor(
    private readonly home: string,
    private readonly options: PluginTestOptions,
  ) {
    this.runtime = runtimeFor(home, options);
    this.service = new PluginService({
      home,
      version: options.version,
      firstPartyPluginsDirectory: resolve(options.directory),
      pluginRuntime: this.runtime,
    });
  }

  log(): Promise<string> {
    return readFile(join(this.home, 'logs/plugins.log'), 'utf8');
  }

  page(path = '/'): PluginTestView {
    return this.open(path);
  }

  slot(slot: PluginSlotInput): PluginTestView {
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

  async close(): Promise<void> {
    for (const view of this.views) view.close();

    try {
      await this.runtime.close();
    } finally {
      await rm(this.home, { recursive: true, force: true });
    }
  }
}

function runtimeFor(home: string, options: PluginTestOptions): PluginRuntime {
  return createPluginRuntime(home, {
    keychain: new MemoryKeychain(),
    projects: async (): Promise<string[]> => [],
    projectInfo: async (): Promise<PluginProjectInfo[]> =>
      options.projects ?? [],
    environment: {
      ...process.env,
      PATH: [...(options.path ?? []), process.env.PATH ?? ''].join(delimiter),
    },
  });
}
