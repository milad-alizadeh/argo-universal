import {
  actionInteraction,
  handlerPath,
} from '@repo/contracts/plugins/action-handler-path';
import { wirePart } from '@repo/contracts/plugins/kit';
import type {
  PluginDispatchInput,
  PluginInteraction,
  WireNode,
} from '@repo/contracts/plugins/wire';
import {
  findWireHandler,
  type WireHandler,
} from '@repo/contracts/plugins/wire-handler';
import { findWireNode } from '@repo/contracts/plugins/wire-node-key';

const missingHandler = 'Plugin handler is no longer available';

export function requireViewHandler(
  root: WireNode | null,
  input: PluginDispatchInput,
): void {
  const node = requireNode(root, input.key);
  const path = handlerPath(input);
  const located = requireHandler(node, path);
  requireEventName(located.handler.$event, path.at(-1) ?? '');
  requirePayload(located.node, actionInteraction(input));
}

function requireNode(root: WireNode | null, key: string): WireNode {
  if (!root) throw new Error('Plugin view is no longer available');
  const node = findWireNode(root, key);

  if (!node) throw new Error(missingHandler);

  return node;
}

function requireHandler(node: WireNode, path: string[]): WireHandler {
  const located = findWireHandler(node, path);

  if (!located) throw new Error(missingHandler);

  return located;
}

function requirePayload(node: WireNode, interaction: PluginInteraction): void {
  if (isOverlayAnswer(interaction)) return;
  requireValidPayload(validPayload(node, interaction));
}

function validPayload(node: WireNode, interaction: PluginInteraction): boolean {
  const schema = wirePart(node.type)?.events[interaction.event];

  return !schema || schema.safeParse(interaction.payload).success;
}

function isOverlayAnswer(interaction: PluginInteraction): boolean {
  return interaction.event === 'onConfirm' || interaction.event === 'onDismiss';
}

function requireValidPayload(valid: boolean): void {
  if (!valid) throw new Error('Invalid Plugin event payload');
}

function requireEventName(actual: string, expected: string): void {
  if (actual !== expected) throw new Error(missingHandler);
}
