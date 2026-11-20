import type { CodexAuth, CodexReading } from '../src/conversation/gpt-live/codex-auth';

// A Codex that hands out these readings in turn, and counts how often it was asked.
export class ScriptedAuth implements CodexAuth {
  public asked = 0;

  public constructor(private readonly readings: CodexReading[]) {}

  public read(): Promise<CodexReading> {
    const last = this.readings.length - 1;
    const reading = this.readings.at(Math.min(this.asked, last));
    this.asked += 1;

    return Promise.resolve(
      reading ?? { signedIn: false, reason: 'No reading' },
    );
  }
}
