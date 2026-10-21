import { lexer, type TokensList } from 'marked';

// About two screens of rows on a wide window, which a flick can cross twice before anything is dropped.
const heldTexts = 120;

// Longer than any message worth holding; a text this size would keep its tokens alive for nothing.
const heldTextLimit = 200_000;

export interface HeldLexerLimits {
  texts: number;
  textLength: number;
}

interface Store extends HeldLexerLimits {
  held: Map<string, TokensList>;
  lex: (text: string) => TokensList;
}

function keepNewest(store: Store, text: string, tokens: TokensList): void {
  store.held.set(text, tokens);

  if (store.held.size <= store.texts) return;
  // A Map reads back in insertion order, so the first key is the one lexed longest ago.
  const oldest = store.held.keys().next();

  if (!oldest.done) store.held.delete(oldest.value);
}

function readHeld(store: Store, text: string): TokensList | undefined {
  const known = store.held.get(text);

  if (!known) return undefined;
  // Re-inserting moves it to the end, so the texts still being drawn are the last to be dropped.
  store.held.delete(text);
  store.held.set(text, known);

  return known;
}

function lexHeld(store: Store, text: string): TokensList {
  const known = readHeld(store, text);

  if (known) return known;
  const tokens = store.lex(text);

  if (text.length <= store.textLength) keepNewest(store, text, tokens);

  return tokens;
}

/*
 * A row leaving the list and coming back would lex its whole text again, so a scroll back over a
 * long Feed re-lexes every message it passes. The texts lexed most recently are kept instead. A
 * streaming row is not covered: each commit asks for a text one step longer than the last, so it
 * lexes afresh every frame and its abandoned steps age out behind the rows still on screen.
 */
export function createHeldLexer(
  limits: HeldLexerLimits = { texts: heldTexts, textLength: heldTextLimit },
  lex: (text: string) => TokensList = lexer,
): (text: string) => TokensList {
  const store: Store = { ...limits, held: new Map(), lex };

  return (text) => lexHeld(store, text);
}

// `marked`'s lexer, over the texts drawn most recently.
export const lexMarkdown = createHeldLexer();
