import type { VoiceAvailability } from '@repo/contracts';
import type { WebSocket } from 'ws';
import type {
  VoiceOption,
  VoiceProvider,
  VoiceStartRequest,
} from '../provider';
import { codexAppServerAuth, type CodexAuth } from './codex-auth';
import { GptLiveCall } from './gpt-live-call';
import {
  createCall,
  defaultVoice,
  joinLink,
  TokenRejected,
} from './gpt-live-requests';

export type GptLiveOptions = {
  auth?: CodexAuth;
  // Where a call is created, and where its control link joins (the call id is appended).
  callsUrl?: string;
  linkUrl?: string;
  // How long a lost control link may stay down before the call ends.
  lostLinkMs?: number;
};

const lostLinkLimitMs = 5000;

const settingsOf = (options: GptLiveOptions): Required<GptLiveOptions> => ({
  auth: codexAppServerAuth(),
  callsUrl: 'https://chatgpt.com/backend-api/codex/realtime/calls',
  linkUrl: 'wss://api.openai.com/v1/live',
  lostLinkMs: lostLinkLimitMs,
  ...options,
});

type Held<T> = { value: T; token: string };

/*
 * The GPT-Live Voice provider: a call on the person's ChatGPT subscription, with the token asked from the installed Codex each time.
 * The token lives in memory for the call and is never stored or refreshed here; a rejected one is asked for again once.
 */
export class GptLiveProvider implements VoiceProvider {
  public readonly id = 'gpt-live';
  public readonly label = 'GPT-Live';
  public readonly experimental = true;
  private readonly settings: Required<GptLiveOptions>;

  public constructor(options: GptLiveOptions = {}) {
    this.settings = settingsOf(options);
  }

  public async availability(): Promise<VoiceAvailability> {
    const reading = await this.settings.auth.read();

    return reading.signedIn
      ? { usable: true }
      : { usable: false, reason: reading.reason };
  }

  public voices(): Promise<VoiceOption[]> {
    return Promise.resolve([{ id: defaultVoice, label: 'Cove' }]);
  }

  public async start(request: VoiceStartRequest): Promise<GptLiveCall> {
    const { callsUrl, linkUrl } = this.settings;
    const token = await this.token();

    const created = await this.asking(
      (fresh) => createCall(callsUrl, fresh, request),
      token,
    );

    const url = `${linkUrl}/${created.value.callId}`;

    // A refusal at the link joins the same call again; it never creates a second one.
    const linked = await this.asking(
      (token) => joinLink(url, token),
      created.token,
    );

    return this.callOf(created.value.answer, url, linked);
  }

  private callOf(
    answer: string,
    url: string,
    link: Held<WebSocket>,
  ): GptLiveCall {
    return new GptLiveCall({
      answer,
      link: link.value,
      rejoin: () => joinLink(url, link.token),
      lostLinkMs: this.settings.lostLinkMs,
    });
  }

  // Runs `attempt` with the token; when the service rejects it, asks Codex once more and runs it again.
  private async asking<T>(
    attempt: (token: string) => Promise<T>,
    token: string,
  ): Promise<Held<T>> {
    try {
      return { value: await attempt(token), token };
    } catch (error) {
      if (!(error instanceof TokenRejected)) throw error;
      const fresh = await this.token();

      return { value: await attempt(fresh), token: fresh };
    }
  }

  private async token(): Promise<string> {
    const reading = await this.settings.auth.read();

    if (!reading.signedIn) throw new Error(reading.reason);

    return reading.token;
  }
}

export const createGptLiveProvider = (
  options: GptLiveOptions = {},
): GptLiveProvider => new GptLiveProvider(options);
