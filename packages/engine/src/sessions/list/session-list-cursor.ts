import type { SessionInfo, SessionListInput } from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { jsonCodec } from '../../lib/json-codec';

const cursorSchema = jsonCodec(
  z.union([
    z.strictObject({ activityAt: z.int(), sessionId: z.string() }),
    z.strictObject({ createdAt: z.int(), sessionId: z.string() }),
  ]),
);

type StoredCursor = z.infer<typeof cursorSchema>;

export type SessionListTime = 'activityAt' | 'createdAt';

export interface SessionListCursor {
  at: number;
  sessionId: string;
}

export const sessionListTime = (input: SessionListInput): SessionListTime =>
  input.order === 'created' ? 'createdAt' : 'activityAt';

export function parseListCursor(
  input: SessionListInput,
): SessionListCursor | undefined {
  if (input.cursor === undefined) return undefined;

  try {
    return decodeListCursor(input.cursor, sessionListTime(input));
  } catch {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid Session list cursor',
    });
  }
}

function decodeListCursor(
  encoded: string,
  field: SessionListTime,
): SessionListCursor {
  const cursor = cursorSchema.parse(
    Buffer.from(encoded, 'base64url').toString('utf8'),
  );

  return { at: cursorTime(cursor, field), sessionId: cursor.sessionId };
}

function cursorTime(cursor: StoredCursor, field: SessionListTime): number {
  if (!(field in cursor))
    throw new Error('Session list cursor has a different order');

  return 'createdAt' in cursor ? cursor.createdAt : cursor.activityAt;
}

export function encodeListCursor(
  last: SessionInfo,
  field: SessionListTime,
): string {
  const time =
    field === 'createdAt'
      ? { createdAt: last.createdAt }
      : { activityAt: last.activityAt };

  return Buffer.from(
    z.encode(cursorSchema, { ...time, sessionId: last.sessionId }),
  ).toString('base64url');
}
