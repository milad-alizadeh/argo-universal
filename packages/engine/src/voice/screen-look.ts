import type {
  AppScreenshotResult,
  ScreenImage,
} from '@repo/contracts/operations';
import type { RelayCall, VoiceSay } from './call-types';
import type { VoiceProviderEvent } from './provider';
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
 * One Voice call's looking at the screen (ADR-0064's screen sight amendment). The voice may have one picture whenever
 * the provider can take it, this Device turned screen sight on and an App is reachable; nothing asks the person first.
 */
export class ScreenLook {
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

  // The voice asked for a picture of the screen.
  public hear(heard: VoiceProviderEvent): void {
    if (heard.type === 'frame.requested') void this.answer(heard.requestId);
  }

  // Answers the voice's request for a picture; the picture itself goes to the provider, never into words.
  private async answer(requestId: string): Promise<void> {
    const text = this.canLook ? await this.capture() : relayWords.noImages;

    this.give({ kind: 'reply', requestId, text, delivery: 'speak' });
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
