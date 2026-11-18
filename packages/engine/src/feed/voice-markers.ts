import type { ContentBlock, SessionUpdate } from '@repo/contracts';

/*
 * The marks an Agent puts at the start of a message on a Voice call (ADR-0062): progress, a result, or silent analysis.
 * They are for the voice, not the reader: the Feed strips them whenever it is read for drawing, and stored text keeps them.
 */
export const voiceMarkers = ['[STATUS]', '[COMPLETE]', '[ANALYSIS]'] as const;

export type VoiceMarker = (typeof voiceMarkers)[number];

export type MarkedText = { marker: VoiceMarker | null; body: string };

const markerOf = (text: string): VoiceMarker | undefined =>
  voiceMarkers.find((marker) => text.startsWith(marker));

// The mark a message starts with, and the message without it and the space after it.
export function readVoiceMarker(text: string): MarkedText {
  const marker = markerOf(text);

  return marker
    ? { marker, body: text.slice(marker.length).trimStart() }
    : { marker: null, body: text };
}

export const stripVoiceMarker = (text: string): string =>
  readVoiceMarker(text).body;

const firstText = (content: readonly ContentBlock[]): string | undefined => {
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

// A row as the Feed draws it: an Agent message without its mark; any other row as it is.
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

      return this.trim(readVoiceMarker(head).body);
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
