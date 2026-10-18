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
import { guardRefusal } from './hook-rules';

// The Plugins that hook one event: those running, those that failed to start, and those exempt from it.
export type HookingPlugins = {
  running: readonly string[];
  stopped: readonly string[];
  exempt: ReadonlySet<string>;
};

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

  // The Plugins whose Hooks may not see this Plugin's call: itself, and every Plugin whose Hook is waiting on it.
  public exempt(caller: string | undefined): ReadonlySet<string> {
    return caller === undefined ? new Set() : this.chain.ancestorsOf(caller);
  }

  // Runs the event through the running Plugins' Hooks, in the order given, then core; a stopped Plugin's guard still refuses.
  public async run(
    { running, stopped, exempt }: HookingPlugins,
    name: HookEventName,
    event: JsonObject,
  ): Promise<Json> {
    const guard = this.registry.orphanedGuard(stopped, name, event);

    if (guard) return this.orphanRefusal(guard, name);
    const hooks = this.registry.matching(running, name, event);

    return this.chain.run({ name, hooks, ancestors: exempt }, event);
  }

  private orphanRefusal(
    { pluginId }: RegisteredHook,
    name: HookEventName,
  ): Json {
    this.log(
      `Plugin ${pluginId}: guard refused ${name} Hook: the Plugin is not running`,
    );

    return guardRefusal(name) ?? null;
  }
}
