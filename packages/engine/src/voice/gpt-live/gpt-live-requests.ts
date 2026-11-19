import { WebSocket } from 'ws';
import type { VoiceStartRequest } from '../provider';

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

const instructions = (briefing: string): string =>
  `Your name is Argo. You are the voice of a coding Agent; when the person asks who you are, you are Argo. Hand the person's requests for work over; speak briefly.\n${briefing}`;

// The session a call starts with, as the ChatGPT route reads it: the service sets its type itself and refuses one sent.
type CallSession = {
  model: string;
  instructions: string;
  audio: { output: { voice: string } };
  delegation: { type: 'client' };
};

const sessionOf = (request: VoiceStartRequest): CallSession => ({
  model,
  instructions: instructions(request.briefing),
  audio: { output: { voice: request.voice ?? defaultVoice } },
  delegation: { type: 'client' },
});

// The ChatGPT route reads one JSON body with the offer and the session, as Codex sends it; it refuses multipart.
const bodyOf = (request: VoiceStartRequest): string =>
  JSON.stringify({ sdp: request.offer, session: sessionOf(request) });

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
  const callId = response.headers.get('location')?.split('/').pop();

  if (!callId) throw new Error('GPT-Live gave no call id.');

  return callId;
}

export type CreatedCall = { answer: string; callId: string };

// Asks the service for a call from the App's offer; the answer is the body and the call id is in `Location`.
export async function createCall(
  url: string,
  token: string,
  request: VoiceStartRequest,
): Promise<CreatedCall> {
  const response = await fetch(`${url}${creationQuery}`, {
    method: 'POST',
    headers: creationHeaders(token),
    body: bodyOf(request),
  });

  assertCreated(response);

  return { answer: await response.text(), callId: callIdOf(response) };
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
