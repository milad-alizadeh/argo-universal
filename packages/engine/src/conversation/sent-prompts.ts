// Where one sent Prompt stands. Only `sent` and `started` count as running.
type PromptState = 'sent' | 'queued' | 'started' | 'finished';

interface PromptRecord {
  state: PromptState;
}

/*
 * The Prompts one Conversation sent to its Session, as plain bookkeeping with no promises in it. Each Prompt is one record:
 * sent, then queued or started or rejected; started, then ended; queued, then started or never started. A Prompt counts as
 * running from the moment it is sent (so the call never idles between the request and its Turn) until it is answered or ends,
 * except a queued one, which counts only from its Turn's start. Every change reports whether `running` flipped, and a Prompt
 * that already finished ignores any later change, so none ends twice.
 */
export class SentPrompts {
  private readonly records = new Set<PromptRecord>();
  private instructed = false;

  // Whether any Prompt is sent and not yet answered, or started and not yet ended.
  public get running(): boolean {
    for (const prompt of this.records)
      if (prompt.state === 'sent' || prompt.state === 'started') return true;

    return false;
  }

  // Sends a Prompt. Only the first carries the voice instruction, even while it waits in the queue.
  public send(): SentPrompt {
    const instructs = !this.instructed;
    const record: PromptRecord = { state: 'sent' };
    const before = this.running;

    this.instructed = true;
    this.records.add(record);

    return new SentPrompt(this, record, {
      instructs,
      startedRunning: !before,
    });
  }

  /** @internal Called by SentPrompt: the Prompt carrying the instruction was not taken by a Turn. */
  public giveBackInstruction(): void {
    this.instructed = false;
  }

  /** @internal Moves a record and says whether `running` flipped. */
  public move(
    record: PromptRecord,
    from: readonly PromptState[],
    to: PromptState,
  ): boolean {
    if (!from.includes(record.state)) return false;

    const before = this.running;
    record.state = to;

    if (to === 'finished') this.records.delete(record);

    return before !== this.running;
  }
}

// One Prompt of a SentPrompts; each change returns whether the call's `running` flipped.
export class SentPrompt {
  // Whether this Prompt carries the voice instruction.
  public readonly instructs: boolean;
  // Whether sending it made the call start running.
  public readonly startedRunning: boolean;

  public constructor(
    private readonly prompts: SentPrompts,
    private readonly record: PromptRecord,
    carries: { instructs: boolean; startedRunning: boolean },
  ) {
    this.instructs = carries.instructs;
    this.startedRunning = carries.startedRunning;
  }

  // The Session queued it: it stops counting until its Turn starts.
  public queued(): boolean {
    return this.prompts.move(this.record, ['sent'], 'queued');
  }

  // Its Turn started (a queued Prompt counts again from here).
  public started(): boolean {
    return this.prompts.move(this.record, ['sent', 'queued'], 'started');
  }

  // Its Turn ended, whatever it ended with.
  public ended(): boolean {
    return this.prompts.move(this.record, ['started'], 'finished');
  }

  // No Turn took it: the instruction it carried is owed again. A queued one stops waiting; one already counted still ends with its Turn.
  public neverStarted(): boolean {
    if (this.record.state === 'started') {
      if (this.instructs) this.prompts.giveBackInstruction();

      return false;
    }

    return this.finish('queued');
  }

  // The Session refused it: it never counts, and the instruction it carried is owed again.
  public rejected(): boolean {
    return this.finish('sent');
  }

  // Finishes it from the given state, once, and owes the instruction again when it carried it.
  private finish(from: PromptState): boolean {
    if (this.record.state !== from) return false;

    if (this.instructs) this.prompts.giveBackInstruction();

    return this.prompts.move(this.record, [from], 'finished');
  }
}
