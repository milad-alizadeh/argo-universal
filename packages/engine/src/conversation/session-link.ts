import type { SpokenRequest } from './relay-words';

/*
 * What the Conversation needs of its Session, and nothing else: it sends the Session Prompts, hears the words and
 * Permission requests in its Feed and hears from the Session when each Turn ends.
 * The Engine's router attaches it once Sessions exist, as an event to the call machine; a call reads it when it starts.
 */

// What happened in the Session that the voice is told about.
export type SessionHappening =
  // An Agent message settled; its text is as stored, marks included.
  | { type: 'agent.message'; id: string; text: string }
  // The person typed a Prompt to the Session.
  | { type: 'person.typed'; text: string }
  // A Permission request is waiting for the person's answer, described in plain words: never the request itself.
  | ({ type: 'permission.waiting'; requestId: string } & SpokenRequest)
  // The waiting Permission request no longer waits: it was answered, or its Turn ended.
  | { type: 'permission.settled'; requestId: string }
  // A Turn ended; `error` is the message of a Turn that failed.
  | { type: 'turn.ended'; stopReason: string; error: string | null };

/*
 * How a request for work reached the Session: it started a Turn, was steered into the running one, or waits behind
 * running work; `notSteered` says why a Prompt that could have steered waits instead. `started` settles true once a
 * Turn holds the Prompt, or false when it left the queue without one; `ended` settles once the Turn holding it ended,
 * with that Turn's id, or with null when none did. Neither rejects.
 */
export type PromptOutcome = {
  started: Promise<boolean>;
  ended: Promise<string | null>;
} & (
  | { status: 'started' | 'steered' }
  | { status: 'queued'; notSteered: string | null }
);

// A Notice the call writes into its Session's Feed.
export interface ConversationNotice {
  title: string;
  description: string;
}

// The two answers speech may give a Permission request; always-allow is only a click (ADR-0044).
export type SpokenPermissionAnswer = 'allow_once' | 'reject_once';

// How a spoken answer landed: applied, too late because the request no longer waits, or not an option the Agent offered.
export type SpokenAnswerOutcome = 'answered' | 'settled' | 'not-offered';

export interface ConversationSessions {
  // Sends the Session a Prompt from the Conversation.
  prompt: (sessionId: string, text: string) => Promise<PromptOutcome>;
  // Cancels the Session's running Turn as the Stop button does; resolves false when no Turn runs.
  stop: (sessionId: string) => Promise<boolean>;
  // Answers the Session's waiting Permission request as the person's click does, with the option of that kind.
  answer: (
    sessionId: string,
    requestId: string,
    answer: SpokenPermissionAnswer,
  ) => Promise<SpokenAnswerOutcome>;
  // Listens to the Session's Feed words and Turn ends; the returned function stops listening.
  watch: (
    sessionId: string,
    listener: (happening: SessionHappening) => void,
  ) => () => void;
  // Writes a Notice into the Session's Feed.
  notice: (sessionId: string, notice: ConversationNotice) => void;
}

const unreachable = 'The Session cannot be reached';

// What a call has before Sessions are attached: nothing to send to, nothing to hear, nowhere to write.
export const detachedSessions: ConversationSessions = {
  prompt: () => Promise.reject(new Error(unreachable)),
  stop: () => Promise.reject(new Error(unreachable)),
  answer: () => Promise.reject(new Error(unreachable)),
  watch: () => (): void => {},
  notice: () => {},
};
