import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import tags from './message-tags.gen.json' with { type: 'json' };

// These three recorded CLI extensions are deliberately ignored (owner #261).
const ignoredExtensions = new Set([
  'command_lifecycle',
  'system/post_turn_summary',
  'system/session_title_changed',
]);

export function isKnownMessage(message: SDKMessage): boolean {
  const tag =
    message.type === 'system' ? `system/${message.subtype}` : message.type;
  return tags.includes(tag) || ignoredExtensions.has(tag);
}
