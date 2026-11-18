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

const creationQuery = '?intent=quicksilver&architecture=avas';

const unauthorized = 401;

const forbidden = 403;

const rejectedStatuses = new Set([unauthorized, forbidden]);

const instructions = (briefing: string): string =>
  `You are the voice of a coding Agent. Hand the person's requests for work over; speak briefly.\n${briefing}`;

const sessionOf = (request: VoiceStartRequest): string =>
  JSON.stringify({
    type: 'realtime',
    model,
    instructions: instructions(request.briefing),
    audio: { output: { voice: request.voice ?? defaultVoice } },
    delegation: { type: 'client' },
  });

function formOf(request: VoiceStartRequest): FormData {
  const form = new FormData();
  form.set('sdp', request.offer);
  form.set('session', sessionOf(request));

  return form;
}

const bearer = (token: string): string => `Bearer ${token}`;

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
    headers: { Authorization: bearer(token), 'openai-alpha': 'quicksilver=v2' },
    body: formOf(request),
  });

  assertCreated(response);

  return { answer: await response.text(), callId: callIdOf(response) };
}

const refusalOf = (status: number | undefined): Error =>
  rejectedStatuses.has(status ?? 0)
    ? new TokenRejected()
    : new Error('GPT-Live refused the control link.');

// Joins the call's control link with the same token.
export function joinLink(url: string, token: string): Promise<WebSocket> {
  const link = new WebSocket(url, {
    headers: { Authorization: bearer(token) },
  });

  return new Promise((resolve, reject) => {
    link.once('open', () => resolve(link));
    link.once('unexpected-response', (_request, response) =>
      reject(refusalOf(response.statusCode)),
    );
    link.once('error', reject);
  });
}
