import { PersonTurns, type PersonWords } from './person-turns';
import { relayWords } from './relay-words';
import type {
  ConversationSessions,
  SpokenAnswerOutcome,
  SpokenPermissionAnswer,
} from './session-link';
import { readSpokenAnswer, type SpokenAnswer } from './spoken-answer';
import { isStopRequest, stopWork } from './spoken-stop';
import type { AnnouncedRequest, WaitingPermission } from './waiting-permission';

// How long a hand-over waits for the final words of the person's turn it names; they arrive 41 to 434 ms after it (voice-mode.md §14).
export const finalWordsWaitMs = 1000;

type Applied = Exclude<SpokenAnswer, 'always'>;

const optionKind: Record<Applied, SpokenPermissionAnswer> = {
  allow: 'allow_once',
  reject: 'reject_once',
};

const appliedWords: Record<Applied, (title: string) => string> = {
  allow: relayWords.allowedOnce,
  reject: relayWords.rejected,
};

const unappliedWords: Record<
  Exclude<SpokenAnswerOutcome, 'answered'>,
  (title: string) => string
> = {
  settled: relayWords.alreadySettled,
  'not-offered': relayWords.answerNotOffered,
};

const outcomeWords = (
  outcome: SpokenAnswerOutcome,
  answer: Applied,
  title: string,
): string =>
  outcome === 'answered'
    ? appliedWords[answer](title)
    : unappliedWords[outcome](title);

type ConsentCall = {
  sessions: ConversationSessions;
  sessionId: string;
  permission: WaitingPermission;
};

/*
 * What the person says to control the work rather than ask for it: "stop", and a Spoken answer to a Permission request.
 * The voice hands over the person's own words, never a reply form (ADR-0064, amended after the #2406 spike), so Argo
 * reads them. A hand-over answers the announced request only when its words are an answer, it names a turn of the
 * person's heard after the announcement, that turn's final words are an answer too, and the request still waits. Then
 * Argo applies it as a click would, and the voice is told what was applied; otherwise nothing is.
 */
export class SpokenConsent {
  private readonly turns = new PersonTurns();

  public constructor(private readonly call: ConsentCall) {}

  public heard(words: PersonWords): void {
    this.turns.heard(words);
  }

  // The voice announced a Permission request: only what the person says from now on can answer it.
  public announced(): void {
    this.turns.announced();
  }

  // What the voice is told of a hand-over that stops the work or answers the announced request; null for a request for work.
  public answer(
    text: string,
    turnId: string | undefined,
  ): Promise<string> | null {
    if (isStopRequest(text))
      return stopWork(this.call.sessions, this.call.sessionId);

    return this.consented(text, turnId);
  }

  private consented(
    text: string,
    turnId: string | undefined,
  ): Promise<string> | null {
    const asked = this.call.permission.announced;
    const said = readSpokenAnswer(text);

    if (!asked || !said) return null;

    return this.answered(asked, said, turnId).catch((error: Error) =>
      relayWords.unsent(error.message),
    );
  }

  private async answered(
    asked: AnnouncedRequest,
    said: SpokenAnswer,
    turnId: string | undefined,
  ): Promise<string> {
    const refused = this.refusal(asked, said);

    if (refused !== null) return refused;
    const heard = await this.personsAnswer(turnId);

    return this.waits(asked)
      ? this.applyHeard(asked, heard)
      : relayWords.alreadySettled(asked.about.title);
  }

  // What the voice is told without hearing the person out: always-allow is a click, and a settled request takes no answer.
  private refusal(asked: AnnouncedRequest, said: SpokenAnswer): string | null {
    if (said === 'always')
      return relayWords.alwaysAllowOnScreen(asked.about.title);

    return this.waits(asked)
      ? null
      : relayWords.alreadySettled(asked.about.title);
  }

  // The answer in the final words of the person's turn, heard since the announcement; null without one.
  private async personsAnswer(
    turnId: string | undefined,
  ): Promise<SpokenAnswer | null> {
    if (turnId === undefined) return null;
    const words = await this.turns.finalSince(turnId, finalWordsWaitMs);

    return words === null ? null : readSpokenAnswer(words);
  }

  private applyHeard(
    asked: AnnouncedRequest,
    heard: SpokenAnswer | null,
  ): Promise<string> | string {
    if (heard === null) return relayWords.answerNotHeard(asked.about.title);

    return heard === 'always'
      ? relayWords.alwaysAllowOnScreen(asked.about.title)
      : this.apply(asked, heard);
  }

  private async apply(
    asked: AnnouncedRequest,
    heard: Applied,
  ): Promise<string> {
    const { sessions, sessionId } = this.call;

    const outcome = await sessions.answer(
      sessionId,
      asked.requestId,
      optionKind[heard],
    );

    return outcomeWords(outcome, heard, asked.about.title);
  }

  private waits(asked: AnnouncedRequest): boolean {
    return this.call.permission.isWaiting(asked.requestId);
  }
}
