import type { VoiceAvailability } from '@repo/contracts';
import { WebSocket } from 'ws';
import type {
  VoiceOption,
  VoiceProvider,
  VoiceStartRequest,
} from '../provider';
import { codexAppServerAuth, type CodexAuth } from './codex-auth';
import { GptLiveCall } from './gpt-live-call';

export type GptLiveOptions = {
  auth?: CodexAuth;
  // Where a call is created, and where its control link joins (the call id is appended).
  callsUrl?: string;
  linkUrl?: string;
  // How long a lost control link may stay down before the call ends.
  lostLinkMs?: number;
};

const defaults = {
  callsUrl: 'https://chatgpt.com/backend-api/codex/realtime/calls',
  linkUrl: 'wss://api.openai.com/v1/live',
  lostLinkMs: 5000,
};

const model = 'gpt-live-1.1-codex';

const defaultVoice = 'cove';

const instructions = (briefing: string): string =>
  `You are the voice of a coding Agent. Hand the person's requests for work over; speak briefly.\n${briefing}`;

// The service refused the ChatGPT token.
class TokenRejected extends Error {
  public constructor() {
    super('GPT-Live rejected the ChatGPT token.');
  }
}

const rejected = (status: number): boolean => status === 401 || status === 403;

type Created = { answer: string; callId: string };

async function createCall(
  url: string,
  token: string,
  request: VoiceStartRequest,
): Promise<Created> {
  const form = new FormData();
  form.set('sdp', request.offer);
  form.set(
    'session',
    JSON.stringify({
      type: 'realtime',
      model,
      instructions: instructions(request.briefing),
      audio: { output: { voice: request.voice ?? defaultVoice } },
      delegation: { type: 'client' },
    }),
  );
  const response = await fetch(`${url}?intent=quicksilver&architecture=avas`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'openai-alpha': 'quicksilver=v2',
    },
    body: form,
  });

  if (rejected(response.status)) throw new TokenRejected();

  if (!response.ok)
    throw new Error(`GPT-Live could not create the call (${response.status}).`);
  const callId = response.headers.get('location')?.split('/').pop();

  if (!callId) throw new Error('GPT-Live gave no call id.');

  return { answer: await response.text(), callId };
}

function joinLink(url: string, token: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const link = new WebSocket(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    link.once('open', () => resolve(link));
    link.once('unexpected-response', (_request, response) =>
      reject(
        rejected(response.statusCode ?? 0)
          ? new TokenRejected()
          : new Error('GPT-Live refused the control link.'),
      ),
    );
    link.once('error', reject);
  });
}

/*
 * The GPT-Live Voice provider: a call on the person's ChatGPT subscription, with the token asked from the installed Codex each time.
 * The token lives in memory for the call and is never stored or refreshed here; a rejected one is asked for again once.
 */
export class GptLiveProvider implements VoiceProvider {
  private readonly auth: CodexAuth;
  private readonly callsUrl: string;
  private readonly linkUrl: string;
  private readonly lostLinkMs: number;

  public constructor(options: GptLiveOptions = {}) {
    this.auth = options.auth ?? codexAppServerAuth();
    this.callsUrl = options.callsUrl ?? defaults.callsUrl;
    this.linkUrl = options.linkUrl ?? defaults.linkUrl;
    this.lostLinkMs = options.lostLinkMs ?? defaults.lostLinkMs;
  }

  public async availability(): Promise<VoiceAvailability> {
    const reading = await this.auth.read();

    return reading.signedIn
      ? { usable: true }
      : { usable: false, reason: reading.reason };
  }

  public voices(): Promise<VoiceOption[]> {
    return Promise.resolve([{ id: defaultVoice, label: 'Cove' }]);
  }

  public async start(request: VoiceStartRequest): Promise<GptLiveCall> {
    try {
      return await this.place(await this.token(), request);
    } catch (error) {
      if (!(error instanceof TokenRejected)) throw error;

      return this.place(await this.token(), request);
    }
  }

  private async token(): Promise<string> {
    const reading = await this.auth.read();

    if (!reading.signedIn) throw new Error(reading.reason);

    return reading.token;
  }

  private async place(
    token: string,
    request: VoiceStartRequest,
  ): Promise<GptLiveCall> {
    const { answer, callId } = await createCall(this.callsUrl, token, request);
    const url = `${this.linkUrl}/${callId}`;
    const link = await joinLink(url, token);

    return new GptLiveCall({
      answer,
      link,
      rejoin: () => joinLink(url, token),
      lostLinkMs: this.lostLinkMs,
    });
  }
}

export const createGptLiveProvider = (
  options: GptLiveOptions = {},
): GptLiveProvider => new GptLiveProvider(options);
