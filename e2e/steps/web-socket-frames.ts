import { z } from 'zod';

// The tRPC frames in one WebSocket message; a batch carries several, and a keep-alive none.
function frames(message: string | Buffer): unknown[] {
  try {
    const value: unknown = JSON.parse(message.toString());

    return Array.isArray(value) ? value : [value];
  } catch {
    return [];
  }
}

// The frames in one message that match the schema.
export function framesMatching<Frame>(
  message: string | Buffer,
  schema: z.ZodType<Frame>,
): Frame[] {
  return frames(message).flatMap((frame) => {
    const parsed = schema.safeParse(frame);

    return parsed.success ? [parsed.data] : [];
  });
}

const Response = z.object({ id: z.number() });

// The call ids the Server answers in one message.
export const responseIds = (message: string | Buffer): number[] =>
  framesMatching(message, Response).map(({ id }) => id);
