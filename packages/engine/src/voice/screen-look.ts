import type {
  AppScreenshotResult,
  ScreenImage,
} from '@repo/contracts/operations';
import type { RelayCall, VoiceSay } from './call-types';
import type { VoiceProviderEvent } from './provider';
import { relayWords } from './relay-words';
import type { VoiceSessions } from './session-link';
import { isTranscript, type TranscriptEvent } from './transcript';

// How long a spoken ask stays good, and how long the voice's request waits for the person's words to be written down.
const timing = { askWindowMs: 30_000, lateWordsMs: 1_500 };

type NotCaptured = Exclude<AppScreenshotResult, { status: 'captured' }>;

const refusedWords = {
  off: relayWords.screenOff,
  declined: relayWords.screenDeclined,
};

const finalWords = (heard: VoiceProviderEvent): TranscriptEvent | null =>
  isTranscript(heard) && heard.final ? heard : null;

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
 * wanted, and recently: an ask goes stale, and words that arrive a moment after the request still count. That ask is
 * spent by the capture it allowed.
 */
export class ScreenLook {
  // When the person last finished speaking since the voice's last words; null when the voice spoke after them.
  private askedAt: number | null = null;
  private heardPerson: (() => void) | null = null;
  // Whether the provider's call can be given a picture; known once it answers.
  private canLook = false;

  public constructor(
    private readonly sessions: VoiceSessions,
    private readonly call: RelayCall,
    private readonly give: (say: VoiceSay) => void,
  ) {}

  // The call was answered, and so is known to take a picture or not.
  public answered(canLook: boolean): void {
    this.canLook = canLook;
  }

  // What the voice asked for and what each side said once it is final: the person's words after the voice's last count as the ask, and the voice's own words, announcing what it wants, reset it.
  public hear(heard: VoiceProviderEvent): void {
    if (heard.type === 'frame.requested') void this.answer(heard.requestId);
    else this.listen(heard);
  }

  private listen(heard: VoiceProviderEvent): void {
    const words = finalWords(heard);

    if (!words) return;

    if (words.type === 'person.transcript') this.personSpoke();
    else this.voiceSpoke();
  }

  private personSpoke(): void {
    this.askedAt = Date.now();
    this.heardPerson?.();
  }

  private voiceSpoke(): void {
    this.askedAt = null;
  }

  // Answers the voice's request for a picture; the picture itself goes to the provider, never into words.
  private async answer(requestId: string): Promise<void> {
    const text = await this.look();

    this.give({ kind: 'reply', requestId, text, delivery: 'speak' });
  }

  private async look(): Promise<string> {
    if (!this.canLook) return relayWords.noImages;

    if (!(await this.asked())) return relayWords.askFirst;
    this.askedAt = null;

    return this.capture();
  }

  private fresh(): boolean {
    return (
      this.askedAt !== null && Date.now() - this.askedAt <= timing.askWindowMs
    );
  }

  // The person's transcript can be final a moment after the voice's request, so a missing ask waits briefly for it.
  private async asked(): Promise<boolean> {
    if (this.fresh()) return true;
    await this.lateWords();

    return this.fresh();
  }

  private lateWords(): Promise<void> {
    return new Promise((resolve) => {
      const done = (): void => {
        clearTimeout(timer);
        this.heardPerson = null;
        resolve();
      };

      const timer = setTimeout(done, timing.lateWordsMs);

      this.heardPerson = done;
    });
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
