import { HookEventName, type PluginManifest } from '@repo/contracts/plugins';
import { HookRegistration } from '@repo/contracts/plugins/hook-protocol';
import type { CallExpression } from 'oxc-parser';
import { requireNoHookOptions } from '../hooks/hook-arguments';
import { HookRegistry, type RegisteredHook } from '../hooks/hook-registry';
import { runtimeError } from '../protocol/runtime';
import { firstString } from './expressions';
import { literalValue } from './literal';

const hookOptionIndex = 2;

const matcherOptionIndex = 3;

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

  requireNoHookOptions(argumentValue(node, optionIndex(node, matcher)));

  return HookRegistration.parse({
    hookId: 0,
    name: firstString(node),
    matcher,
  });
}

function optionIndex(
  node: CallExpression,
  matcher: ReturnType<typeof literalValue>,
): number {
  const matched =
    node.arguments.length > matcherOptionIndex || matcher !== undefined;

  return matched ? matcherOptionIndex : hookOptionIndex;
}

function argumentValue(
  node: CallExpression,
  index: number,
): ReturnType<typeof literalValue> {
  const argument = node.arguments[index];

  if (!argument || argument.type === 'SpreadElement') return;

  return literalValue(argument);
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
