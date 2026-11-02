import type { ContentBlock, SessionRecord } from '@repo/contracts';
import { titleFromPrompt } from '../../../feed/prompt-title';
import type { SessionInput } from '../../session-data';
import { latestTurnOf } from '../../stored-turn';

type Turns = Parameters<typeof latestTurnOf>[0];

// The first prompt a New Session was sent with, which it holds from Send until its Turn commits.
const promptOf = (input: SessionInput | undefined): ContentBlock[] =>
  input?.kind === 'new' ? input.prompt : [];

// Until the Feed names it, a prompted Session lists under the first line of its prompt.
const titled = (row: SessionRecord, prompt: ContentBlock[]): SessionRecord =>
  row.title === '' && row.titleSource === 'prompt'
    ? { ...row, title: titleFromPrompt(prompt) }
    : row;

const whenListed = (
  listed: boolean,
  row: SessionRecord,
): SessionRecord | undefined => (listed ? row : undefined);

// A Session lists before its first Turn only when an Agent started it or it already holds a prompt.
const listsBeforeTurn = (row: SessionRecord, prompt: ContentBlock[]): boolean =>
  row.startedBySessionId !== null || prompt.length > 0;

const hasTurn = (row: SessionRecord, turns: Turns): boolean =>
  Boolean(latestTurnOf(turns, row.id));

/*
 * An empty Session waits for its first prompt, so an abandoned New Session draft never reaches the list; a Session
 * lists as soon as it holds one, before the Agent has applied its choices and the Turn commits.
 * A Session an Agent started has no draft behind it: it lists at once, or the user cannot open what their Agent made.
 */
export function listedSession(
  rejected: ReadonlySet<string>,
  inputOf: (sessionId: string) => SessionInput | undefined,
  { row, turns }: { row: SessionRecord; turns: Turns },
): SessionRecord | undefined {
  if (rejected.has(row.id)) return undefined;

  const prompt = promptOf(inputOf(row.id));

  const listed = listsBeforeTurn(row, prompt) || hasTurn(row, turns);

  return whenListed(listed, titled(row, prompt));
}
