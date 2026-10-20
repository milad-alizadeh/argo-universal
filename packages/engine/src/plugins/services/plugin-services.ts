import type { CoreHooks, PluginProjectInfo } from '@repo/contracts/plugins';
import type { PluginAssetRef } from '@repo/contracts/plugins/assets';
import { replyFailure } from '../access/capability-refusal';
import {
  PluginAccess,
  type AccessScope,
  type ActivatedPlugin,
} from '../access/plugin-access';
import type { OpenedAsset, PluginAssets } from '../assets/plugin-assets';
import { type PluginClock } from '../clock';
import type { SpawnCaller, Waiting } from '../hooks/spawn-hooks';
import type { PluginReply, PluginValue } from '../protocol/runtime';
import type { Keychain } from './keychain';
import {
  answerCall,
  failureLine,
  type CallReach,
  type StateRequest,
} from './plugin-calls';
import type { PluginNetwork } from './plugin-fetch';
import { PluginResources, supersede } from './plugin-resources';
import type { PluginStorage } from './storage';

export type PluginServiceOptions = {
  assets: PluginAssets;
  environment?: NodeJS.ProcessEnv;
  log: (line: string) => void;
  projects: () => Promise<readonly string[]>;
  projectInfo: () => Promise<PluginProjectInfo[]>;
  projectPath?: (projectId: string) => Promise<string | undefined>;
  network?: PluginNetwork;
  settings?: (pluginId: string, key: string) => Promise<PluginValue>;
  hooks?: CoreHooks;
  waiting?: Waiting;
  clock?: PluginClock;
  watchProjects?: (changed: () => void) => () => void;
};

type Held = { generation: number; resources: PluginResources };

// Nothing is granted to a Plugin whose worker isn't loaded.
const notActivated: Pick<AccessScope, 'grants' | 'codeFolder'> = {
  grants: [],
  codeFolder: null,
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
    request: StateRequest & Pick<CallReach, 'projectId' | 'query'>,
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
    request: StateRequest & Pick<CallReach, 'projectId' | 'query'>,
  ): Promise<PluginValue> {
    return answerCall(
      {
        ...this.reach(caller),
        projectId: request.projectId,
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
      storage: this.storage,
      keychain: this.keychain,
      options: this.options,
      network: this.options.network ?? {},
      access: (): PluginAccess => this.access(pluginId),
      activated: (): ActivatedPlugin | undefined =>
        this.activated.get(pluginId),
    };
  }

  private access(pluginId: string): PluginAccess {
    const { grants, codeFolder } = this.activated.get(pluginId) ?? notActivated;

    return new PluginAccess({
      grants,
      codeFolder,
      dataFolder: this.storage.folderOf(pluginId),
      projects: this.options.projects,
      environment: this.options.environment,
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
