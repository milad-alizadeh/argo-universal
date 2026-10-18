import type {
  PluginAssetRef,
  PluginAssetSource,
} from '@repo/contracts/plugins/assets';
import { resolvePluginAsset } from './asset-resolver';
import type { OpenedAsset } from './assets';
import { spawnHooks, type SpawnCaller } from './hooks/spawn-hooks';
import type { Keychain } from './keychain';
import {
  PluginAccess,
  type AccessScope,
  type ActivatedPlugin,
} from './plugin-access';
import { attemptPluginCall } from './plugin-attempt';
import {
  describeCall,
  failureLine,
  machineCall,
  replyError,
  type MachineContext,
  type StateRequest,
  type UnkeptRequest,
} from './plugin-calls';
import { PluginResources, supersede } from './plugin-resources';
import type { PluginServiceOptions } from './plugin-service-options';
import type { PluginReply, PluginValue } from './runtime-protocol';
import type { PluginStorage } from './storage';

type Held = { generation: number; resources: PluginResources };

const notActivated: Pick<AccessScope, 'grants' | 'codeFolder'> = {
  grants: [],
  codeFolder: null,
};

export class PluginServices {
  private readonly held = new Map<string, Held>();
  private readonly activated = new Map<string, ActivatedPlugin>();

  constructor(
    private readonly storage: PluginStorage,
    private readonly keychain: Keychain,
    private readonly options: PluginServiceOptions,
  ) {}

  activate(pluginId: string, plugin: ActivatedPlugin): void {
    this.held.get(pluginId)?.resources.release();
    this.held.delete(pluginId);
    this.activated.set(pluginId, plugin);
  }

  public openAsset(reference: PluginAssetRef): Promise<OpenedAsset | null> {
    if (!this.activated.has(reference.pluginId)) return Promise.resolve(null);

    return this.options.assets.open(reference);
  }

  async handle(
    pluginId: string,
    generation: number,
    request: StateRequest,
  ): Promise<PluginReply> {
    try {
      const value = await this.attempt({ pluginId, generation }, request);

      return { ok: true, value };
    } catch (error) {
      this.options.log(failureLine(pluginId, request, error));

      return { ok: false, error: replyError(error) };
    }
  }

  release(pluginId: string): void {
    this.held.get(pluginId)?.resources.release();
    this.activated.delete(pluginId);
  }

  close(): void {
    for (const { resources } of this.held.values()) resources.release();
    this.activated.clear();
    this.storage.close();
  }

  private attempt(
    caller: SpawnCaller,
    request: StateRequest,
  ): Promise<PluginValue> {
    return attemptPluginCall({
      caller,
      request,
      resources: this.resources(caller.pluginId, caller.generation),
      storage: this.storage,
      keychain: this.keychain,
      options: this.options,
      logCall: () => this.logCall(caller.pluginId, request),
      callMachine: (held, unkept) => this.callMachine(caller, held, unkept),
    });
  }

  private callMachine(
    caller: SpawnCaller,
    resources: PluginResources,
    request: UnkeptRequest,
  ): Promise<PluginValue> {
    if (request.api === 'assets')
      return this.resolveAsset(caller.pluginId, request.source, resources);

    return machineCall(this.context(caller, resources, request), request);
  }

  private resolveAsset(
    pluginId: string,
    source: PluginAssetSource,
    resources: PluginResources,
  ): Promise<PluginAssetRef> {
    return resolvePluginAsset(source, {
      pluginId,
      resources,
      access: this.access(pluginId),
      network: this.options.network ?? {},
      assets: this.options.assets,
      activated: () => this.activated.get(pluginId),
    });
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

  private resources(pluginId: string, generation: number): PluginResources {
    const held = this.held.get(pluginId);

    if (held?.generation === generation) return held.resources;
    supersede(held, generation);

    const resources = new PluginResources();
    this.held.set(pluginId, { generation, resources });

    return resources;
  }
}
