import { z } from 'zod';

// Codex sends a context append in pieces of at most this many bytes (codex-rs methods_frameless_bidi.rs, CONTEXT_APPEND_MAX_BYTES).
const appendMaxBytes = 500;

const channel = z.enum(['speakable', 'commentary']).optional();

const content = z
  .array(
    z.strictObject({
      type: z.literal('input_text'),
      text: z
        .string()
        .refine((text) => Buffer.byteLength(text) <= appendMaxBytes),
    }),
  )
  .length(1);

// What the control link carries out of a call, as Codex writes it (codex-rs realtime_websocket/protocol.rs, RealtimeOutboundMessage).
const sentMessage = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('delegation.context.append'),
    delegation_item_id: z.string(),
    channel,
    content,
  }),
  z.strictObject({
    type: z.literal('session.context.append'),
    channel,
    content,
  }),
  z.strictObject({ type: z.literal('session.close') }),
]);

export type SentMessage = z.infer<typeof sentMessage>;

// The message a text frame carries; null for one not in the shape Codex sends, which the service would not understand.
export function sentMessageOf(words: string): SentMessage | null {
  try {
    const message = sentMessage.safeParse(JSON.parse(words));

    return message.success ? message.data : null;
  } catch {
    return null;
  }
}
