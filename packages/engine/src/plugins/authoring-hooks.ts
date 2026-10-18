import { HookEventName, type PluginManifest } from '@repo/contracts/plugins';
import { HookRegistration } from '@repo/contracts/plugins/hook-protocol';
import type { CallExpression } from 'oxc-parser';
import { firstString } from './authoring-expressions';
import { literalValue } from './authoring-literal';
import { HookRegistry, type RegisteredHook } from './hooks/hook-registry';

const hookOptionIndex = 2;

const matcherOptionIndex = 3;

import { runtimeError } from './runtime-protocol';

export function hookSourceReason(
  node: CallExpression,
  manifest: PluginManifest,
): string | undefined {
  const name = firstString(node);

  if (name === undefined) return;

  if (!HookEventName.safeParse(name).success)
    return `Unknown Hook event ${name}`;

  return registrationReason(node, manifest);
}

function registrationReason(
  node: CallExpression,
  manifest: PluginManifest,
): string | undefined {
  const registry = configuredRegistry(manifest);

  try {
    registry.register(sourceHook(node, manifest.id));

    return undefined;
  } catch (error) {
    return runtimeError(error);
  }
}

function registrationOf(node: CallExpression): HookRegistration {
  const matcher = argumentValue(node, 1);

  const options = argumentValue(
    node,
    matcher === undefined ? hookOptionIndex : matcherOptionIndex,
  );

  return HookRegistration.parse({
    hookId: 0,
    name: firstString(node),
    matcher,
    guard: hasGuard(options),
  });
}

function argumentValue(
  node: CallExpression,
  index: number,
): ReturnType<typeof literalValue> {
  const argument = node.arguments[index];

  if (!argument || argument.type === 'SpreadElement') return;

  return literalValue(argument);
}

function hasGuard(value: ReturnType<typeof literalValue>): boolean {
  if (!value) return false;

  return typeof value === 'object' ? objectGuard(value) : false;
}

type LiteralContainer = Extract<
  NonNullable<ReturnType<typeof literalValue>>,
  object
>;

function objectGuard(value: LiteralContainer): boolean {
  return 'guard' in value && value.guard === true;
}

function configuredRegistry(manifest: PluginManifest): HookRegistry {
  const registry = new HookRegistry();
  registry.allow(manifest.id, {
    events: manifest.contributes.hooks ?? [],
    grants: manifest.capabilities ?? [],
  });

  return registry;
}

function sourceHook(node: CallExpression, pluginId: string): RegisteredHook {
  return { ...registrationOf(node), pluginId, generation: 0 };
}
