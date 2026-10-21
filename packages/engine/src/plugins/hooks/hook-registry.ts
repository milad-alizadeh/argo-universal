import type { HookEventName, PluginCapability } from '@repo/contracts/plugins';
import type {
  HookRegistration,
  JsonObject,
} from '@repo/contracts/plugins/hook-protocol';
import { CapabilityRefusal } from '../access/capability-refusal';
import { matches, takesMatcher } from './hook-rules';

// What a Plugin's manifest lets it hook: the events it declares, and its Grants.
export type HookAllowance = {
  events: readonly HookEventName[];
  grants: readonly PluginCapability[];
};

export type RegisteredHook = HookRegistration & {
  pluginId: string;
  generation: number;
};

type RegistrationRule = {
  refuses: (
    registration: HookRegistration,
    allowance: HookAllowance,
  ) => boolean;
  reason: (registration: HookRegistration) => string;
};

// Hooking `process.spawn` sees other Plugins' commands, so it needs a Grant of its own (ADR-0030).
const isGranted = (
  { name }: HookRegistration,
  { grants }: HookAllowance,
): boolean =>
  name !== 'process.spawn' ||
  grants.some((grant) => grant.kind === 'hook' && grant.event === name);

// In order: the first rule that applies is the reason given.
const registrationRules: RegistrationRule[] = [
  {
    refuses: ({ name }, { events }) => !events.includes(name),
    reason: ({ name }) => `${name} is not a Hook the manifest declares`,
  },
  {
    refuses: (registration, allowance) => !isGranted(registration, allowance),
    reason: ({ name }) => `hooking ${name} needs its Capability`,
  },
  {
    refuses: ({ name, matcher }) =>
      matcher !== undefined && !takesMatcher(name),
    reason: ({ name }) => `${name} takes no matcher`,
  },
];

const nothingAllowed: HookAllowance = { events: [], grants: [] };

// The Hooks each loaded worker registered with `argo.on`, kept in the order it registered them.
export class HookRegistry {
  private readonly allowances = new Map<string, HookAllowance>();
  private readonly registered = new Map<string, RegisteredHook[]>();
  public allow(pluginId: string, allowance: HookAllowance): void {
    this.allowances.set(pluginId, allowance);
  }

  public register(hook: RegisteredHook): void {
    const allowance = this.allowances.get(hook.pluginId) ?? nothingAllowed;

    const refused = registrationRules.find(({ refuses }) =>
      refuses(hook, allowance),
    );

    if (refused) throw new CapabilityRefusal(refused.reason(hook));
    this.registered.set(hook.pluginId, [...this.current(hook), hook]);
  }

  // A reloaded, stopped or crashed worker's Hooks go with it.
  public release(pluginId: string): void {
    this.registered.delete(pluginId);
  }

  // The Hooks on this event, in the order of the Plugins given, then of registration.
  public matching(
    pluginIds: readonly string[],
    name: HookEventName,
    event: JsonObject,
  ): RegisteredHook[] {
    return pluginIds.flatMap((pluginId) =>
      (this.registered.get(pluginId) ?? []).filter(
        (hook) => hook.name === name && matches(name, hook.matcher, event),
      ),
    );
  }

  private current({ pluginId, generation }: RegisteredHook): RegisteredHook[] {
    return (this.registered.get(pluginId) ?? []).filter(
      (hook) => hook.generation === generation,
    );
  }
}
