import type { VoiceProviderEvent } from '../provider';

export type Speaker = 'person' | 'voice';

export type Utterance = { id: string; text: string };

// An open turn, with the words last reported as its final.
type OpenTurn = Utterance & { speaker: Speaker; reported: string };

export const transcriptType = {
  person: 'person.transcript',
  voice: 'voice.transcript',
} as const;

const finalOf = (
  speaker: Speaker,
  id: string,
  text: string,
): VoiceProviderEvent => ({
  type: transcriptType[speaker],
  id,
  text,
  final: true,
});

/*
 * The turns still open, with each one's transcript so far: `turn.created` starts it and each `turn.delta` adds to it.
 * Live calls showed the two always add up to the transcript `turn.done` gives, so they stand in for it, and no spoken words are lost:
 * a new turn settles every open turn's words so far, in spoken order; a turn done without a transcript keeps the words heard in it; the call closing settles them all.
 * A turn settled early is reported again only when its words changed, under the same id, so its row is updated rather than doubled.
 */
export class SpokenTurns {
  private readonly open = new Map<Speaker, OpenTurn>();

  // A new turn; it supersedes the speaker's open turn, and cuts the other speaker's short.
  public opened(speaker: Speaker, turn: Utterance): VoiceProviderEvent[] {
    const said = this.others(turn.id).flatMap((open) => this.settle(open));

    this.open.set(speaker, { ...turn, speaker, reported: '' });

    return said;
  }

  public grew(turnId: string, delta: string): void {
    for (const turn of this.open.values())
      if (turn.id === turnId) turn.text += delta;
  }

  // The turn as done: its own transcript, else the words heard in it.
  public done(speaker: Speaker, turn: Utterance): VoiceProviderEvent[] {
    const open = this.matching(speaker, turn.id);

    this.open.delete(speaker);

    return this.settle({
      ...open,
      text: turn.text.trim() ? turn.text : open.text,
    });
  }

  // The call closing: every open turn keeps what it said so far.
  public closing(): VoiceProviderEvent[] {
    const said = this.others('').flatMap((open) => this.settle(open));

    this.open.clear();

    return said;
  }

  private others(turnId: string): OpenTurn[] {
    return [...this.open.values()].filter((open) => open.id !== turnId);
  }

  // The open turn under `turnId`, or a fresh one when it was never seen open.
  private matching(speaker: Speaker, turnId: string): OpenTurn {
    const open = this.open.get(speaker);

    return open?.id === turnId
      ? open
      : { id: turnId, text: '', speaker, reported: '' };
  }

  private settle(turn: OpenTurn): VoiceProviderEvent[] {
    const text = turn.text.trim();

    if (!text || text === turn.reported) return [];
    turn.reported = text;

    return [finalOf(turn.speaker, turn.id, text)];
  }
}
