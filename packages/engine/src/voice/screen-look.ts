import type {
  AppScreenshotResult,
  ScreenImage,
} from '@repo/contracts/operations';
import type { RelayCall, VoiceSay } from './call-types';
import { relayWords } from './relay-words';
import type { VoiceSessions } from './session-link';

type NotCaptured = Exclude<AppScreenshotResult, { status: 'captured' }>;

const refusedWords = {
  off: relayWords.screenOff,
  declined: relayWords.screenDeclined,
};

// What the voice is told when no picture was taken.
function whyNot(result: NotCaptured): string {
  if (result.status === 'refused') return refusedWords[result.reason];

  return result.status === 'not_available'
    ? relayWords.screenUnavailable(result.reason)
    : relayWords.screenUnreachable;
}

/*
 * One Voice call's looking at the screen (ADR-0064's screen sight amendment). The voice may have one picture only when
 * the provider can take it and the person spoke after the voice last did, which is after the voice announced what it
 * wanted; that ask is spent by the capture it allowed.
 */
export class ScreenLook {
  private spokenAsk = false;

  public constructor(
    private readonly sessions: VoiceSessions,
    private readonly call: RelayCall,
    private readonly give: (say: VoiceSay) => void,
  ) {}

  // The person's words after the voice's last count as the ask; the voice's own words, announcing what it wants, reset it.
  public transcribed(speaker: 'person' | 'voice'): void {
    this.spokenAsk = speaker === 'person';
  }

  // Answers the voice's request for a picture; the picture itself goes to the provider, never into words.
  public async answer(requestId: string): Promise<void> {
    const text = await this.look();

    this.give({ kind: 'reply', requestId, text, delivery: 'speak' });
  }

  private async look(): Promise<string> {
    const refusal = this.refusal();

    if (refusal) return refusal;
    this.spokenAsk = false;

    return this.capture();
  }

  private refusal(): string | null {
    if (!this.call.images) return relayWords.noImages;

    return this.spokenAsk ? null : relayWords.askFirst;
  }

  private async capture(): Promise<string> {
    try {
      return this.seen(await this.sessions.capture(this.call.sessionId));
    } catch (error) {
      return relayWords.screenUnavailable(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private seen(result: AppScreenshotResult): string {
    if (result.status !== 'captured') return whyNot(result);
    this.show(result.image);

    return relayWords.looked;
  }

  private show(image: ScreenImage): void {
    this.give({ kind: 'image', image });
  }
}
