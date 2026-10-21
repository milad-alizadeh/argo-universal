import type { PluginProjectInfo } from '@repo/contracts/plugins';
import type { PluginAssetRef } from '@repo/contracts/plugins/assets';
import { replyFailure } from '../access/capability-refusal';
import type { PluginAccess, ActivatedPlugin } from '../access/plugin-access';
import { AccountServices } from '../accounts/account-services';
import type { OpenedAsset } from '../assets/plugin-assets';
import type { SpawnCaller } from '../hooks/spawn-hooks';
import type { PluginReply, PluginValue } from '../protocol/runtime';
import type { Keychain } from './keychain';
import {
  answerCall,
  failureLine,
  type CallReach,
  type StateRequest,
} from './plugin-calls';
import { PluginResources, supersede } from './plugin-resources';
import type { PluginServiceOptions } from './plugin-service-options';
import { serviceAccess } from './service-access';
import type { PluginStorage } from './storage';

export type { PluginServiceOptions } from './plugin-service-options';

type ServiceRequest = StateRequest &
  Pick<CallReach, 'projectId' | 'query' | 'serverDevice'>;

type Held = { generation: number; resources: PluginResources };

// The Server boundary for Plugin API calls; each Plugin keeps its own storage and Keychain namespace.
export class PluginServices {
  public readonly accountCalls;
  private readonly held = new Map<string, Held>();
  private readonly activated = new Map<string, ActivatedPlugin>();

  constructor(
    private readonly storage: PluginStorage,
    private readonly keychain: Keychain,
    private readonly options: PluginServiceOptions,
  ) {
    this.accountCalls = new AccountServices(options);
  }

  onStorageWrite(written: (pluginId: string) => void): void {
    this.storage.onWrite(written);
  }

  projectInfo(): Promise<PluginProjectInfo[]> {
    return this.options.projectInfo();
  }

  watchProjects(changed: () => void): () => void {
    return this.options.watchProjects?.(changed) ?? (() => {});
  }

  // A first-party Plugin's declared Capabilities, granted as its worker loads with no prompt (ADR-0030).
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
    request: ServiceRequest,
  ): Promise<PluginReply> {
    try {
      const value = await this.attempt({ pluginId, generation }, request);

      return { ok: true, value };
    } catch (error) {
      this.options.log(failureLine(pluginId, request, error));

      return replyFailure(error);
    }
  }

  // Reload, turning off and a crash end the Plugin's child processes, timers and requests, and its Grants.
  release(pluginId: string): void {
    this.accountCalls.release(pluginId);
    this.held.get(pluginId)?.resources.release();
    this.activated.delete(pluginId);
    this.storage.release(pluginId);
  }

  close(): void {
    this.accountCalls.close();

    for (const { resources } of this.held.values()) resources.release();
    this.activated.clear();
    this.storage.close();
  }

  private attempt(
    caller: SpawnCaller,
    request: ServiceRequest,
  ): Promise<PluginValue> {
    return answerCall(
      {
        ...this.reach(caller),
        projectId: request.projectId,
        serverDevice: request.serverDevice,
        query: request.query,
      },
      request,
    );
  }

  private reach({ pluginId, generation }: SpawnCaller): CallReach {
    return {
      pluginId,
      generation,
      resources: this.resources(pluginId, generation),
      ...this.ports(),
      access: this.access(pluginId),
      activated: (): ActivatedPlugin | undefined =>
        this.activated.get(pluginId),
    };
  }

  private ports(): Pick<
    CallReach,
    'storage' | 'keychain' | 'options' | 'network' | 'accounts' | 'oauth'
  > {
    return {
      storage: this.storage,
      keychain: this.keychain,
      options: this.options,
      network: this.options.network ?? {},
      ...this.accountCalls.reach(),
    };
  }

  private access(pluginId: string): () => PluginAccess {
    return () =>
      serviceAccess({
        pluginId,
        plugin: this.activated.get(pluginId),
        storage: this.storage,
        options: this.options,
      });
  }

  // A later worker generation starts with fresh resources; an earlier one's calls are refused.
  private resources(pluginId: string, generation: number): PluginResources {
    const held = this.held.get(pluginId);

    if (held?.generation === generation) return held.resources;
    supersede(held, generation);

    const resources = new PluginResources(this.options.clock);
    this.held.set(pluginId, { generation, resources });

    return resources;
  }
}
