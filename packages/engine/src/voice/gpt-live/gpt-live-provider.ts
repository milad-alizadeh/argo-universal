import type { VoiceAvailability } from '@repo/contracts';
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

/*
 * The GPT-Live Voice provider: a call on the person's ChatGPT subscription, with the token asked from the installed Codex each time.
 * The token lives in memory for the call and is never stored or refreshed here; a rejected one is asked for again once.
 */
export class GptLiveProvider implements VoiceProvider {
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
    try {
      return await this.place(await this.token(), request);
    } catch (error) {
      if (!(error instanceof TokenRejected)) throw error;

      return this.place(await this.token(), request);
    }
  }

  private async token(): Promise<string> {
    const reading = await this.settings.auth.read();

    if (!reading.signedIn) throw new Error(reading.reason);

    return reading.token;
  }

  private async place(
    token: string,
    request: VoiceStartRequest,
  ): Promise<GptLiveCall> {
    const { callsUrl, linkUrl, lostLinkMs } = this.settings;
    const { answer, callId } = await createCall(callsUrl, token, request);
    const url = `${linkUrl}/${callId}`;
    const link = await joinLink(url, token);

    return new GptLiveCall({
      answer,
      link,
      rejoin: () => joinLink(url, token),
      lostLinkMs,
    });
  }
}

export const createGptLiveProvider = (
  options: GptLiveOptions = {},
): GptLiveProvider => new GptLiveProvider(options);
