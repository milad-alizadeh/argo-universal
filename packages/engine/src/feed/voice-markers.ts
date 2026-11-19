import type { ContentBlock, SessionUpdate } from '@repo/contracts';

/*
 * The marks an Agent puts at the start of a message on a Voice call (ADR-0063): progress, a result, or silent analysis.
 * They are for the voice, not the reader. The Feed reads every stored, queued or in-memory row without them, so no
 * reader has to remember to; only the Feed's live changes, which the voice hears, still carry them.
 */
const voiceMarkers = ['[STATUS]', '[COMPLETE]', '[ANALYSIS]'] as const;

type VoiceMarker = (typeof voiceMarkers)[number];

// What the first Prompt of a call asks of the Agent, so the voice can tell progress from a result.
const voiceInstruction = [
  'A person is talking to you through a voice, and the voice reads your messages aloud.',
  'Begin every message with one mark:',
  '[STATUS] for progress the person may hear while you work,',
  '[COMPLETE] for the result, a question, or a blocker once you are done,',
  '[ANALYSIS] for notes that must stay silent.',
  'Keep spoken messages short and plain; do not read out code or tool output.',
  'End the call by running the Argo Operation voice.hangUp, but only when the person clearly says they are done with the call, such as goodbye or hang up.',
  'Do not end it when the person asks you to stop work, pause or wait: that is not the end of the call.',
].join('\n');

const instructionBreak = `${voiceInstruction}\n\n`;

// The first Prompt of a call: the instruction, then what the person asked for.
export const withVoiceInstruction = (request: string): string =>
  `${instructionBreak}${request}`;

// What a call's Prompt asked for, without the instruction the first one carries.
export const withoutVoiceInstruction = (prompt: string): string =>
  prompt.startsWith(instructionBreak)
    ? prompt.slice(instructionBreak.length)
    : prompt;

// What an Agent message is to the voice, and its text without the mark; a message without a mark is progress.
export type VoiceMessage = {
  kind: 'progress' | 'result' | 'analysis';
  body: string;
};

const kinds: Record<VoiceMarker, VoiceMessage['kind']> = {
  '[STATUS]': 'progress',
  '[COMPLETE]': 'result',
  '[ANALYSIS]': 'analysis',
};

const markerOf = (text: string): VoiceMarker | undefined =>
  voiceMarkers.find((marker) => text.startsWith(marker));

// What a message is to the voice; the body drops the mark and the space after it.
export function readVoiceMessage(text: string): VoiceMessage {
  const marker = markerOf(text);

  return marker
    ? { kind: kinds[marker], body: text.slice(marker.length).trimStart() }
    : { kind: 'progress', body: text };
}

const stripVoiceMarker = (text: string): string => readVoiceMessage(text).body;

// The text of a message's first block, when it is text.
export const firstText = (
  content: readonly ContentBlock[],
): string | undefined => {
  const [first] = content;

  return first?.type === 'text' ? first.text : undefined;
};

const withFirstText = (
  content: ContentBlock[],
  text: string,
): ContentBlock[] => {
  const [first, ...rest] = content;

  return first?.type === 'text' ? [{ ...first, text }, ...rest] : content;
};

// A row as it is read: an Agent message without its mark; any other row as it is.
export function withoutVoiceMarkers<Row extends SessionUpdate>(row: Row): Row {
  if (row.sessionUpdate !== 'agent_message') return row;
  const text = firstText(row.content);

  if (text === undefined) return row;

  return {
    ...row,
    content: withFirstText(row.content, stripVoiceMarker(text)),
  };
}

/*
 * The visible text of a message that arrives in chunks. The start of a message that could still become a mark is held
 * back, so a mark split across chunks never shows; once the start is known the rest passes as it comes.
 */
export class VoiceMarkerStream {
  private held = '';
  private mode: 'head' | 'trim' | 'pass' = 'head';

  public push(chunk: string): string {
    if (this.mode === 'pass') return chunk;

    if (this.mode === 'trim') return this.trim(chunk);

    return this.decide(this.held + chunk);
  }

  private trim(chunk: string): string {
    const rest = chunk.trimStart();

    if (rest.length > 0) this.mode = 'pass';

    return rest;
  }

  private decide(head: string): string {
    if (markerOf(head)) {
      this.mode = 'trim';
      this.held = '';

      return this.trim(stripVoiceMarker(head));
    }

    if (voiceMarkers.some((marker) => marker.startsWith(head))) {
      this.held = head;

      return '';
    }

    this.mode = 'pass';
    this.held = '';

    return head;
  }
}
