import type { IncomingMessage, ServerResponse } from 'node:http';
import type { RawData } from 'ws';
import { z } from 'zod';

// The session object a call is created with, as the service reads it. A `type` is refused: the service sets it.
const session = z.strictObject({
  model: z.string(),
  instructions: z.string(),
  audio: z.looseObject({ output: z.looseObject({ voice: z.string() }) }),
  delegation: z.looseObject({ type: z.string() }),
});

// The ChatGPT route reads one JSON body holding the offer and the session; it refuses multipart (#2406 probe, 2026-11-19).
const callRequest = z.strictObject({ sdp: z.string(), session });

export type CallRequest = z.infer<typeof callRequest>;

async function bodyOf(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) chunks.push(Buffer.from(chunk));

  return Buffer.concat(chunks);
}

const isJson = (request: IncomingMessage): boolean =>
  (request.headers['content-type'] ?? '').startsWith('application/json');

// What a call-creation request asks for; null when its form is not the one the service reads.
export async function callRequestOf(
  request: IncomingMessage,
): Promise<CallRequest | null> {
  try {
    if (!isJson(request)) return null;

    return callRequest.parse(JSON.parse((await bodyOf(request)).toString('utf8')));
  } catch {
    return null;
  }
}

export type Reply = {
  status: number;
  headers: Record<string, string>;
  body: string;
};

export const refused = (status: number, body: string): Reply => ({
  status,
  headers: {},
  body,
});

export const bearerOf = (request: IncomingMessage): string | undefined =>
  request.headers.authorization?.replace(/^Bearer /, '');

// A text frame's words; audio frames and anything else read as nothing.
export const wordsOf = (data: RawData, binary: boolean): string =>
  Buffer.isBuffer(data) && !binary ? data.toString('utf8') : '';

export function answer(response: ServerResponse, reply: Reply): void {
  response.writeHead(reply.status, reply.headers);
  response.end(reply.body);
}
