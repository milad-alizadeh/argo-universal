import { WebSocket } from 'ws';

// The service refused the ChatGPT token.
export class TokenRejected extends Error {
  public constructor() {
    super('GPT-Live rejected the ChatGPT token.');
  }
}

const model = 'gpt-live-1.1-codex';

export const defaultVoice = 'cove';

// Both the call's creation and its control link carry this, or the service refuses them.
const alpha = 'quicksilver=v2';

const creationQuery = '?intent=quicksilver&architecture=avas';

const unauthorized = 401;

const forbidden = 403;

const rejectedStatuses = new Set([unauthorized, forbidden]);

// What a call is created from: the App's offer, what the voice is told, and the voice.
export type CallOpening = {
  offer: string;
  instructions: string;
  voice?: string;
  // Whether the voice says a short line when it hands work over; the service's own default when left out.
  filler?: boolean;
  // Given to the voice before the call starts.
  opening?: string;
};

type SeededItem = {
  type: 'message';
  role: 'developer';
  content: [{ type: 'input_text'; text: string }];
};

/*
 * The session a call starts with, as the ChatGPT route reads it: the service sets its type itself and refuses one sent.
 * `ack_filler` and `initial_items` are the only options it was seen to honour; noise reduction, turn detection and
 * text output make it drop the call (live probe, 2026-11-19, #2469).
 */
type CallSession = {
  model: string;
  instructions: string;
  audio: { output: { voice: string } };
  delegation: { type: 'client'; ack_filler?: boolean };
  initial_items?: SeededItem[];
};

const seeded = (text: string): SeededItem => ({
  type: 'message',
  role: 'developer',
  content: [{ type: 'input_text', text }],
});

function sessionOf(opening: CallOpening): CallSession {
  const session: CallSession = {
    model,
    instructions: opening.instructions,
    audio: { output: { voice: opening.voice ?? defaultVoice } },
    delegation: { type: 'client', ack_filler: opening.filler },
  };

  if (opening.opening) session.initial_items = [seeded(opening.opening)];

  return session;
}

// The ChatGPT route reads one JSON body with the offer and the session, as Codex sends it; it refuses multipart.
const bodyOf = (opening: CallOpening): string =>
  JSON.stringify({ sdp: opening.offer, session: sessionOf(opening) });

const bearer = (token: string): string => `Bearer ${token}`;

type CreationHeaders = {
  Authorization: string;
  'openai-alpha': typeof alpha;
  'Content-Type': 'application/json';
};

const creationHeaders = (token: string): CreationHeaders => ({
  Authorization: bearer(token),
  'openai-alpha': alpha,
  'Content-Type': 'application/json',
});

function assertCreated(response: Response): void {
  if (rejectedStatuses.has(response.status)) throw new TokenRejected();

  if (!response.ok)
    throw new Error(`GPT-Live could not create the call (${response.status}).`);
}

function callIdOf(response: Response): string {
  const conversationId = response.headers.get('location')?.split('/').pop();

  if (!conversationId) throw new Error('GPT-Live gave no call id.');

  return conversationId;
}

export type CreatedCall = { answer: string; conversationId: string };

// Asks the service for a call from the App's offer; the answer is the body and the call id is in `Location`.
export async function createCall(
  url: string,
  token: string,
  opening: CallOpening,
): Promise<CreatedCall> {
  const response = await fetch(`${url}${creationQuery}`, {
    method: 'POST',
    headers: creationHeaders(token),
    body: bodyOf(opening),
  });

  assertCreated(response);

  return { answer: await response.text(), conversationId: callIdOf(response) };
}

// The service no longer knows the call: it ended the call itself and answers its link with 404 `session_id_not_found` (#2405 probe, 2026-11-19).
export class CallGone extends Error {
  public constructor() {
    super('GPT-Live no longer has the call (404)');
  }
}

const notFound = 404;

const tokenRefusalOf = (status: number): Error =>
  rejectedStatuses.has(status)
    ? new TokenRejected()
    : new Error('GPT-Live refused the control link.');

const refusalOf = (status: number | undefined): Error =>
  status === notFound ? new CallGone() : tokenRefusalOf(status ?? 0);

// How long joining the link may take before it counts as refused, so a join in flight never holds a lost call open.
const joinTimeoutMs = 10_000;

// Joins the call's control link with the same token.
export function joinLink(url: string, token: string): Promise<WebSocket> {
  const link = new WebSocket(url, {
    headers: { Authorization: bearer(token), 'openai-alpha': alpha },
    handshakeTimeout: joinTimeoutMs,
  });

  return new Promise((resolve, reject) => {
    link.once('open', () => resolve(link));
    link.once('unexpected-response', (_request, response) =>
      reject(refusalOf(response.statusCode)),
    );
    link.once('error', reject);
  });
}
