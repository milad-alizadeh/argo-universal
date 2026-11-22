/*
 * SPIKE (latency on a phone): times the turn gap, from the person's last sound to the voice's first, out of the two
 * levels a call's stats give. Levels are sampled every 50 ms, so a gap is right to about that much either way.
 *
 * The microphone counts only while the voice is quiet, so the voice's own echo on a loudspeaker is never taken for the
 * person. A gap therefore needs the person to speak after the voice stopped; talking over the voice measures nothing.
 */
export const turnGapLevels = {
  // Above this the microphone is taken as speech, not the room.
  person: 0.02,
  // Above this the voice is taken as speaking.
  voice: 0.01,
};

// The person is speaking once the microphone has been loud this long, so a click or a cough starts no turn.
const personRunMs = 150;

// The voice's turn is over once it has been quiet this long; a shorter quiet is a breath inside one answer.
const voicePauseMs = 400;

export class TurnGaps {
  public readonly gaps: number[] = [];
  private voiceSpeaking = false;
  private voiceLoudAt = 0;
  private runStartedAt: number | undefined;
  private personTalking = false;
  private personEndedAt: number | undefined;

  // One reading of both levels at `at` milliseconds; returns the gap this reading closed, if it closed one.
  public sample(at: number, input: number, output: number): number | undefined {
    if (output > turnGapLevels.voice) return this.voiceHeard(at);

    if (this.voiceSpeaking && at - this.voiceLoudAt < voicePauseMs)
      return undefined;

    this.voiceSpeaking = false;
    this.personHeard(at, input > turnGapLevels.person);

    return undefined;
  }

  private voiceHeard(at: number): number | undefined {
    const gap =
      !this.voiceSpeaking && this.personEndedAt !== undefined
        ? at - this.personEndedAt
        : undefined;

    this.voiceSpeaking = true;
    this.voiceLoudAt = at;
    this.runStartedAt = undefined;
    this.personTalking = false;
    this.personEndedAt = undefined;

    if (gap !== undefined) this.gaps.push(gap);

    return gap;
  }

  private personHeard(at: number, loud: boolean): void {
    if (!loud) {
      this.runStartedAt = undefined;

      return;
    }

    this.runStartedAt ??= at;

    if (at - this.runStartedAt >= personRunMs) this.personTalking = true;

    if (this.personTalking) this.personEndedAt = at;
  }
}
