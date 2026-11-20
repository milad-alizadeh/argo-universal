import type { ConversationAvailability } from '@repo/contracts';
import type { WebSocket } from 'ws';
import type {
  VoiceOption,
  VoicePreviewRequest,
  ConversationProvider,
  ConversationStartRequest,
} from '../provider';
import { codexAppServerAuth, type CodexAuth } from './codex-auth';
import { GptLiveCall } from './gpt-live-call';
import {
  callInstructions,
  previewInstructionsOf,
} from './gpt-live-instructions';
import {
  createCall,
  joinLink,
  TokenRejected,
  type CallOpening,
} from './gpt-live-requests';
import { gptLiveConversations } from './gpt-live-voices';

export type GptLiveOptions = {
  auth?: CodexAuth;
  // Where a call is created, and where its control link joins (the call id is appended).
  callsUrl?: string;
  linkUrl?: string;
  // How long a lost control link may stay down before the call ends.
  lostLinkMs?: number;
  // How often the control link is checked with a ping.
  pingMs?: number;
};

const lostLinkLimitMs = 5000;

const pingEveryMs = 15_000;

const settingsOf = (options: GptLiveOptions): Required<GptLiveOptions> => ({
  auth: codexAppServerAuth(),
  callsUrl: 'https://chatgpt.com/backend-api/codex/realtime/calls',
  linkUrl: 'wss://api.openai.com/v1/live',
  lostLinkMs: lostLinkLimitMs,
  pingMs: pingEveryMs,
  ...options,
});

// The service speaks first only when asked on the control link; its instructions alone leave it silent (live probe, 2026-11-19).
const sayExactly = (words: string): string => `Say exactly: "${words}"`;

/*
 * The GPT-Live Conversation provider: a call on the person's ChatGPT subscription, with the token asked from the installed Codex each time.
 * The token lives in memory for the call and is never stored or refreshed here; a rejected one is asked for again once per start.
 */
export class GptLiveProvider implements ConversationProvider {
  public readonly id = 'gpt-live';
  public readonly label = 'GPT-Live';
  public readonly experimental = true;
  private readonly settings: Required<GptLiveOptions>;

  public constructor(options: GptLiveOptions = {}) {
    this.settings = settingsOf(options);
  }

  public async availability(): Promise<ConversationAvailability> {
    const reading = await this.settings.auth.read();

    return reading.signedIn
      ? { usable: true }
      : { usable: false, reason: reading.reason };
  }

  public voices(): Promise<VoiceOption[]> {
    return Promise.resolve(gptLiveConversations);
  }

  public start(request: ConversationStartRequest): Promise<GptLiveCall> {
    return this.open({
      offer: request.offer,
      instructions: callInstructions(request),
      voice: request.voice,
      filler: request.filler,
      opening: request.opening,
    });
  }

  public async preview(request: VoicePreviewRequest): Promise<GptLiveCall> {
    const call = await this.open({
      offer: request.offer,
      instructions: previewInstructionsOf(request.style),
      voice: request.voice,
    });

    call.tell(sayExactly(request.words), 'speak');

    return call;
  }

  private async open(opening: CallOpening): Promise<GptLiveCall> {
    const { callsUrl, linkUrl } = this.settings;
    const token = new StartToken(await this.token(), () => this.token());

    const created = await token.asking((fresh) =>
      createCall(callsUrl, fresh, opening),
    );

    const url = `${linkUrl}/${created.conversationId}`;

    // A refusal at the link joins the same call again; it never creates a second one.
    const link = await token.asking((fresh) => joinLink(url, fresh));

    return this.callOf({ answer: created.answer, url, link }, token.current);
  }

  private callOf(
    { answer, url, link }: { answer: string; url: string; link: WebSocket },
    token: string,
  ): GptLiveCall {
    return new GptLiveCall({
      answer,
      link,
      rejoin: () => joinLink(url, token),
      lostLinkMs: this.settings.lostLinkMs,
      pingMs: this.settings.pingMs,
    });
  }

  private async token(): Promise<string> {
    const reading = await this.settings.auth.read();

    if (!reading.signedIn) throw new Error(reading.reason);

    return reading.token;
  }
}

// The token one call start holds: when the service rejects it, Codex is asked for a fresh one once in the whole start.
class StartToken {
  private renewed = false;

  public constructor(
    private token: string,
    private readonly ask: () => Promise<string>,
  ) {}

  public get current(): string {
    return this.token;
  }

  public async asking<T>(attempt: (token: string) => Promise<T>): Promise<T> {
    try {
      return await attempt(this.token);
    } catch (error) {
      if (!(error instanceof TokenRejected)) throw error;

      return this.renewing(attempt, error);
    }
  }

  private async renewing<T>(
    attempt: (token: string) => Promise<T>,
    rejected: TokenRejected,
  ): Promise<T> {
    if (this.renewed) throw rejected;
    this.renewed = true;
    this.token = await this.ask();

    return attempt(this.token);
  }
}

export const createGptLiveProvider = (
  options: GptLiveOptions = {},
): GptLiveProvider => new GptLiveProvider(options);
