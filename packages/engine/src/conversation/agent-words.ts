import { readConversationSections, type VoiceMessage } from '../feed';
import type { VoiceSay } from './conversation-types';
import { inPieces } from './pieces';
import type { VoiceDelivery } from './provider';
import { endingDelivery, endingText, told, type Ended } from './relay-ending';
import { relayWords } from './relay-words';
import type { SessionHappening } from './session-link';

// What the Agent said during the running Turn that the voice may still need at its end.
type TurnMemory = { resultSent: boolean; last: string | null };

const freshTurn = (): TurnMemory => ({ resultSent: false, last: null });

// The sections of an Agent message the voice may hear: all but silent analysis.
const sayable = (text: string): VoiceMessage[] =>
  readConversationSections(text).filter(({ kind }) => kind !== 'analysis');

export type Said = Extract<
  SessionHappening,
  { type: 'agent.message' | 'person.typed' }
>;

/*
 * What the voice is told of the Session's words: the Agent's results to read out, its progress as background, a Prompt
 * the person typed, and each Turn's end. Silent analysis and Tool output never reach it.
 */
export class AgentWords {
  private turn = freshTurn();

  public constructor(private readonly speak: (say: VoiceSay) => void) {}

  public said(happening: Said): void {
    if (happening.type === 'agent.message')
      this.agentSaid(happening.text, happening.turnless);
    else this.tell(relayWords.typed(happening.text), 'background');
  }

  public tell(
    text: string,
    delivery: VoiceDelivery,
    kind: 'tell' | 'result' = 'tell',
  ): void {
    for (const piece of inPieces(text))
      this.speak({ kind, text: piece, delivery });
  }

  public turnEnded(ended: Ended): void {
    const { resultSent, last } = this.turn;
    this.turn = freshTurn();

    if (!resultSent && last) this.handOver(last);
    this.tell(endingText(ended), endingDelivery(ended, told(resultSent, last)));
  }

  // The Agent's answer, for the voice to read out.
  private handOver(text: string): void {
    this.tell(text, 'speak', 'result');
  }

  /*
   * Analysis stays silent, so the voice is never told it. A message outside any Turn has no Turn end to speak its
   * progress at, so only its result is spoken (#2506).
   */
  private agentSaid(text: string, turnless: boolean): void {
    for (const section of sayable(text)) {
      this.pass(section);

      if (!turnless) this.remember(section);
    }
  }

  // A result is read out; progress is background.
  private pass({ kind, body }: VoiceMessage): void {
    if (kind === 'result') this.handOver(body);
    else this.tell(body, 'background');
  }

  private remember({ kind, body }: VoiceMessage): void {
    if (kind === 'result') this.turn = { resultSent: true, last: null };
    else if (kind === 'progress') this.turn.last = body;
  }
}
