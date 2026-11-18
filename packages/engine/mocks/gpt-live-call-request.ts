import type { IncomingMessage, ServerResponse } from 'node:http';
import type { RawData } from 'ws';
import { z } from 'zod';

// The session object a call is created with, as the service reads it.
const session = z.looseObject({
  type: z.string(),
  model: z.string(),
  instructions: z.string(),
  audio: z.looseObject({ output: z.looseObject({ voice: z.string() }) }),
  delegation: z.looseObject({ type: z.string() }),
});

// Both multipart fields must be present, and the session must read as JSON of that form.
const callRequest = z.object({
  sdp: z.string(),
  session: z
    .string()
    .transform((text) => JSON.parse(text))
    .pipe(session),
});

export type CallRequest = z.infer<typeof callRequest>;

async function bodyOf(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) chunks.push(Buffer.from(chunk));

  return Buffer.concat(chunks);
}

async function fieldsOf(
  request: IncomingMessage,
): Promise<Record<string, string | File>> {
  const contentType = request.headers['content-type'] ?? '';

  const form = await new Response(await bodyOf(request), {
    headers: { 'content-type': contentType },
  }).formData();

  return Object.fromEntries(form.entries());
}

// What a call-creation request asks for; null when its form is not the one the service reads.
export async function callRequestOf(
  request: IncomingMessage,
): Promise<CallRequest | null> {
  try {
    return callRequest.parse(await fieldsOf(request));
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
