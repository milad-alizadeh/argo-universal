import type { HookEventName } from '@repo/contracts/plugins';
import type {
  HookCall,
  Json,
  JsonObject,
} from '@repo/contracts/plugins/hook-protocol';
import { replyError } from '../plugin-calls';
import {
  runtimeError,
  type PluginReply,
  type PluginValue,
} from '../runtime-protocol';
import { HookChain, type HookCaller, type HookChainInput } from './hook-chain';
import {
  HookRegistry,
  type HookAllowance,
  type RegisteredHook,
} from './hook-registry';

// The runtime's side of `argo.on`: what each worker registered, and the chains that run them.
export class PluginHooks {
  private readonly registry = new HookRegistry();
  private readonly chain: HookChain;
  private readonly log: (line: string) => void;

  public constructor(input: HookChainInput) {
    this.chain = new HookChain(input);
    this.log = input.log;
  }

  // The latest manifest's events and Grants apply to the next worker's `argo.on` calls.
  public allow(pluginId: string, allowance: HookAllowance): void {
    this.registry.allow(pluginId, allowance);
  }

  public async reply(caller: HookCaller, call: HookCall): Promise<PluginReply> {
    try {
      return { ok: true, value: await this.handle(caller, call) };
    } catch (error) {
      return { ok: false, error: replyError(error) };
    }
  }

  private async handle(
    caller: HookCaller,
    call: HookCall,
  ): Promise<PluginValue> {
    if (call.action === 'next')
      return this.chain.next(caller, call.invocation, call.event);

    if (call.action === 'settle')
      this.chain.settle(caller, call.invocation, call.outcome);
    else this.register({ ...call, ...caller });

    return null;
  }

  // `argo.on` is logged like every other `argo` call; a refused one names its reason.
  private register(hook: RegisteredHook): void {
    try {
      this.registry.register(hook);
      this.log(`Plugin ${hook.pluginId}: argo.on ${hook.name}`);
    } catch (error) {
      this.log(
        `Plugin ${hook.pluginId}: refused argo.on ${hook.name}: ${runtimeError(error)}`,
      );

      throw error;
    }
  }

  public release(pluginId: string): void {
    this.registry.release(pluginId);
    this.chain.release(pluginId);
  }

  // Runs the event through these Plugins' Hooks, in the order given, then core.
  public run(
    pluginIds: readonly string[],
    name: HookEventName,
    event: JsonObject,
  ): Promise<Json> {
    const hooks = this.registry.matching(pluginIds, name, event);

    return this.chain.run({ name, hooks }, event);
  }
}
