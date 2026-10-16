import { pluginKeychainService, type Keychain } from './keychain';
import { PluginAccess, type PluginGrant } from './plugin-access';
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
import type { PluginReply, PluginValue, SecretCall } from './runtime-protocol';
import type { PluginStorage } from './storage';

type Held = { generation: number; resources: PluginResources };

// Where the Server logs Plugin calls, which Projects Plugins may read, and the Server's network settings.
export type PluginServiceOptions = {
  log: (line: string) => void;
  projects: () => Promise<readonly string[]>;
  network?: PluginNetwork;
};

// Nothing is granted to a Plugin that was never activated with its manifest's Capabilities.
const noGrant: PluginGrant = { capabilities: [], codeFolder: '' };

// What a Plugin's `argo` calls reach on the Server. Core keeps nothing: storage and the Keychain belong to the Plugin.
export class PluginServices {
  private readonly held = new Map<string, Held>();
  private readonly grants = new Map<string, PluginGrant>();

  constructor(
    private readonly storage: PluginStorage,
    private readonly keychain: Keychain,
    private readonly options: PluginServiceOptions,
  ) {}

  // A first-party Plugin's declared Capabilities, granted at activation with no prompt (ADR-0030).
  grant(pluginId: string, grant: PluginGrant): void {
    this.grants.set(pluginId, grant);
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

  // Reload, turning off and a crash end the Plugin's child processes, timers and requests.
  release(pluginId: string): void {
    this.held.get(pluginId)?.resources.release();
  }

  close(): void {
    for (const { resources } of this.held.values()) resources.release();
    this.storage.close();
  }

  private async attempt(
    pluginId: string,
    generation: number,
    request: StateRequest,
  ): Promise<PluginValue> {
    const resources = this.resources(pluginId, generation);

    if (request.api === 'storage' || request.api === 'secrets') {
      this.logCall(pluginId, request);

      return this.perform(pluginId, request);
    }

    return machineCall(this.context(pluginId, resources, request), request);
  }

  private context(
    pluginId: string,
    resources: PluginResources,
    request: StateRequest,
  ): MachineContext {
    return {
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
    return new PluginAccess({
      grant: this.grants.get(pluginId) ?? noGrant,
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

  private async perform(
    pluginId: string,
    request: Extract<StateRequest, { api: 'storage' | 'secrets' }>,
  ): Promise<PluginValue> {
    if (request.api === 'storage')
      return this.storage.execute(pluginId, request.queries);

    return this.secrets(pluginId, request.call);
  }

  private async secrets(
    pluginId: string,
    call: SecretCall,
  ): Promise<PluginValue> {
    const service = pluginKeychainService(pluginId);

    if (call.action === 'get') return this.keychain.get(service, call.account);

    await (call.action === 'set'
      ? this.keychain.set(service, call.account, call.value)
      : this.keychain.delete(service, call.account));

    return null;
  }
}

function supersede(held: Held | undefined, generation: number): void {
  if (!held) return;

  if (generation < held.generation)
    throw new Error('Plugin worker was replaced');
  held.resources.release();
}
