import type { CoreHooks } from '@repo/contracts/plugins';
import {
  spawnHooks,
  type SpawnCaller,
  type Waiting,
} from './hooks/spawn-hooks';
import { answerKept, isKeptRequest, type Kept } from './kept-calls';
import type { Keychain } from './keychain';
import {
  PluginAccess,
  type AccessScope,
  type ActivatedPlugin,
} from './plugin-access';
import {
  describeCall,
  failureLine,
  machineCall,
  replyError,
  type MachineContext,
  type StateRequest,
} from './plugin-calls';
import type { PluginNetwork } from './plugin-fetch';
import { PluginResources } from './plugin-resources';
import type { PluginReply, PluginValue } from './runtime-protocol';
import type { PluginStorage } from './storage';

type Held = { generation: number; resources: PluginResources };

// Nothing is granted to a Plugin whose worker isn't loaded.
const notActivated: Pick<AccessScope, 'grants' | 'codeFolder'> = {
  grants: [],
  codeFolder: null,
};

// Where the Server logs Plugin calls, which Projects Plugins may read, the Server's network settings, and the `process.spawn` Hooks.
export type PluginServiceOptions = {
  log: (line: string) => void;
  projects: () => Promise<readonly string[]>;
  network?: PluginNetwork;
  // Answers `argo.settings.get` from the Plugin's `contributes.settings` values.
  settings?: (pluginId: string, key: string) => Promise<PluginValue>;
  hooks?: CoreHooks;
  waiting?: Waiting;
};

// What a Plugin's `argo` calls reach on the Server. Core keeps nothing: storage and the Keychain belong to the Plugin.
export class PluginServices {
  private readonly held = new Map<string, Held>();
  private readonly activated = new Map<string, ActivatedPlugin>();

  constructor(
    private readonly storage: PluginStorage,
    private readonly keychain: Keychain,
    private readonly options: PluginServiceOptions,
  ) {}

  // A first-party Plugin's declared Capabilities, granted as its worker loads with no prompt (ADR-0030).
  activate(pluginId: string, plugin: ActivatedPlugin): void {
    this.activated.set(pluginId, plugin);
  }

  async handle(
    pluginId: string,
    generation: number,
    request: StateRequest,
  ): Promise<PluginReply> {
    try {
      const value = await this.attempt(pluginId, generation, request);

      return { ok: true, value };
    } catch (error) {
      this.options.log(failureLine(pluginId, request, error));

      return { ok: false, error: replyError(error) };
    }
  }

  // Reload, turning off and a crash end the Plugin's child processes, timers and requests, and its Grants.
  release(pluginId: string): void {
    this.held.get(pluginId)?.resources.release();
    this.activated.delete(pluginId);
  }

  close(): void {
    for (const { resources } of this.held.values()) resources.release();
    this.activated.clear();
    this.storage.close();
  }

  private async attempt(
    pluginId: string,
    generation: number,
    request: StateRequest,
  ): Promise<PluginValue> {
    const resources = this.resources(pluginId, generation);

    if (isKeptRequest(request)) {
      this.logCall(pluginId, request);

      return answerKept(this.kept(), pluginId, request);
    }

    return machineCall(
      this.context({ pluginId, generation }, resources, request),
      request,
    );
  }

  private context(
    { pluginId, generation }: SpawnCaller,
    resources: PluginResources,
    request: StateRequest,
  ): MachineContext {
    return {
      pluginId,
      spawning: spawnHooks(this.options, { pluginId, generation }),
      access: this.access(pluginId),
      resources,
      network: this.options.network ?? {},
      allowed: () => this.logCall(pluginId, request),
    };
  }

  private kept(): Kept {
    const { storage, keychain } = this;

    return { storage, keychain, settings: this.options.settings };
  }

  private logCall(pluginId: string, request: StateRequest): void {
    this.options.log(`Plugin ${pluginId}: ${describeCall(request)}`);
  }

  private access(pluginId: string): PluginAccess {
    const { grants, codeFolder } = this.activated.get(pluginId) ?? notActivated;

    return new PluginAccess({
      grants,
      codeFolder,
      dataFolder: this.storage.folderOf(pluginId),
      projects: this.options.projects,
    });
  }

  // A later worker generation starts with fresh resources; an earlier one's calls are refused.
  private resources(pluginId: string, generation: number): PluginResources {
    const held = this.held.get(pluginId);

    if (held?.generation === generation) return held.resources;
    supersede(held, generation);

    return this.hold(pluginId, generation);
  }

  private hold(pluginId: string, generation: number): PluginResources {
    const resources = new PluginResources();
    this.held.set(pluginId, { generation, resources });

    return resources;
  }
}

function supersede(held: Held | undefined, generation: number): void {
  if (!held) return;

  if (generation < held.generation)
    throw new Error('Plugin worker was replaced');
  held.resources.release();
}
