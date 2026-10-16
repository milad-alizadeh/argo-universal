import { pluginKeychainService, type Keychain } from './keychain';
import { PluginResources } from './plugin-resources';
import {
  runtimeError,
  type FetchCall,
  type PluginReply,
  type PluginRequest,
  type PluginValue,
  type ProcessCall,
  type SecretCall,
} from './runtime-protocol';
import type { PluginStorage } from './storage';

type Held = { generation: number; resources: PluginResources };

// What a Plugin's `argo` calls reach on the Server. Core keeps nothing: storage and the Keychain belong to the Plugin.
export class PluginServices {
  private readonly storage: PluginStorage;
  private readonly keychain: Keychain;
  private readonly log: (line: string) => void;
  private readonly held = new Map<string, Held>();

  constructor(
    storage: PluginStorage,
    keychain: Keychain,
    log: (line: string) => void,
  ) {
    this.storage = storage;
    this.keychain = keychain;
    this.log = log;
  }

  async handle(
    pluginId: string,
    generation: number,
    request: PluginRequest,
  ): Promise<PluginReply> {
    try {
      const value = await this.attempt(pluginId, generation, request);

      return { ok: true, value };
    } catch (error) {
      this.log(`Plugin ${pluginId}: argo call failed: ${runtimeError(error)}`);

      return { ok: false, error: runtimeError(error) };
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
    request: PluginRequest,
  ): Promise<PluginValue> {
    this.log(`Plugin ${pluginId}: ${describeCall(request)}`);
    const resources = this.resources(pluginId, generation);

    return this.perform(pluginId, resources, request);
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
    resources: PluginResources,
    request: PluginRequest,
  ): Promise<PluginValue> {
    if (request.api === 'storage')
      return this.storage.execute(pluginId, request.queries);

    if (request.api === 'secrets') return this.secrets(pluginId, request.call);

    return machineCall(resources, request);
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

type MachineRequest = Exclude<PluginRequest, { api: 'storage' | 'secrets' }>;

function machineCall(
  resources: PluginResources,
  request: MachineRequest,
): Promise<PluginValue> {
  if (request.api === 'fs') return resources.fs(request.call);

  if (request.api === 'process') return resources.process(request.call);

  return resources.fetch(request.call);
}

// The log names the call and where it points, never a secret value or a file's content.
function describeCall(request: PluginRequest): string {
  if (request.api === 'storage')
    return `argo.storage ${request.queries.length}`;

  if (request.api === 'secrets')
    return `argo.secrets.${request.call.action} ${request.call.account}`;

  return describeMachineCall(request);
}

function supersede(held: Held | undefined, generation: number): void {
  if (!held) return;

  if (generation < held.generation)
    throw new Error('Plugin worker was replaced');
  held.resources.release();
}

function describeMachineCall(request: MachineRequest): string {
  if (request.api === 'fs')
    return `argo.fs.${request.call.action} ${request.call.path}`;

  if (request.api === 'process')
    return `argo.process.${request.call.action} ${describeProcess(request.call)}`;

  return describeFetch(request.call);
}

const describeFetch = ({ method = 'GET', url }: FetchCall): string =>
  `argo.fetch ${method} ${url}`;

const describeProcess = (call: ProcessCall): string =>
  'argv' in call ? call.argv.join(' ') : call.id;
