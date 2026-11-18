/*
 * What the Voice call needs of its Session, and nothing else: it sends the Session Prompts and hears what happens in its Feed.
 * The Engine's router supplies it once Sessions exist; the machine reads it when a call starts.
 */

// What happened in the Session's Feed that the voice is told about.
export type SessionHappening =
  // An Agent message settled; its text is as stored, marks included.
  | { type: 'agent.message'; id: string; text: string }
  // The person typed a Prompt to the Session.
  | { type: 'person.typed'; text: string }
  // A Prompt the Voice call sent reached the Feed, in the Turn it started or was steered into.
  | { type: 'voice.prompted'; turnId: string | null }
  // A Turn ended; `error` is the message of a Turn that failed.
  | {
      type: 'turn.ended';
      turnId: string | null;
      stopReason: string;
      error: string | null;
    };

// How a request for work reached the Session: it started a Turn or waits behind running work.
export type PromptOutcome = 'started' | 'queued';

// A Notice the call writes into its Session's Feed.
export interface VoiceNotice {
  title: string;
  description: string;
}

export interface VoiceSessions {
  // Sends the Session a Prompt from the Voice call.
  prompt: (sessionId: string, text: string) => Promise<PromptOutcome>;
  // Listens to the Session's Feed; the returned function stops listening.
  watch: (
    sessionId: string,
    listener: (happening: SessionHappening) => void,
  ) => () => void;
  // Writes a Notice into the Session's Feed.
  notice: (sessionId: string, notice: VoiceNotice) => void;
}

// A holder the Engine fills after the call machine exists, because Sessions are built later.
export class SessionLink {
  private sessions: VoiceSessions | null = null;

  public attach(sessions: VoiceSessions): void {
    this.sessions = sessions;
  }

  public get current(): VoiceSessions | null {
    return this.sessions;
  }
}
