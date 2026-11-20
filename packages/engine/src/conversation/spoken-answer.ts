// What the person's words answer to a Permission request: allow once, reject, or always allow, which only a click gives.
export type SpokenAnswer = 'allow' | 'reject' | 'always';

type WordKind = SpokenAnswer | 'filler';

const allowWords = ['allow', 'approve', 'permit', 'accept', 'yes', 'yeah'];

const goAheadWords = ['yep', 'yup', 'go', 'ahead'];

// A negation in an answer never allows: "Don't allow it" reads as reject.
const rejectWords = ['reject', 'deny', 'refuse', 'decline', 'block', 'no'];

const negationWords = ['nope', 'nah', 'not', 'dont', 'never'];

// Words around an answer that ask nothing of their own.
const fillerWords = [
  'it',
  'that',
  'this',
  'once',
  'just',
  'please',
  'now',
  'then',
  'ok',
  'okay',
  'the',
  'one',
  'time',
  'thanks',
  'do',
];

const kindOf = new Map<string, WordKind>([
  ...[...allowWords, ...goAheadWords].map((word) => [word, 'allow'] as const),
  ...[...rejectWords, ...negationWords].map(
    (word) => [word, 'reject'] as const,
  ),
  ['always', 'always'],
  ...fillerWords.map((word) => [word, 'filler'] as const),
]);

// The strongest answer first: any negation rejects, then always-allow, then allow.
const answerOrder: readonly SpokenAnswer[] = ['reject', 'always', 'allow'];

// Lower case words, with punctuation dropped, so "Don't!" reads as "dont".
const wordsOf = (said: string): string[] =>
  said
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{N}\s]/gu, '')
    .split(/\s+/)
    .filter(Boolean);

const answerOf = (
  kinds: ReadonlySet<WordKind | undefined>,
): SpokenAnswer | null =>
  kinds.has(undefined)
    ? null
    : (answerOrder.find((answer) => kinds.has(answer)) ?? null);

/*
 * Argo's own reading of what the person said to a waiting Permission request (ADR-0064): the voice hands over their words
 * as heard, never a reply form. Only an utterance made wholly of answer words is an answer; anything else is not.
 */
export const readSpokenAnswer = (said: string): SpokenAnswer | null => {
  const kinds = new Set(wordsOf(said).map((word) => kindOf.get(word)));

  return answerOf(kinds);
};
