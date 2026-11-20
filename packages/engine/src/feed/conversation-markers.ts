import type { ContentBlock, SessionUpdate } from '@repo/contracts';

/*
 * The marks an Agent puts at the start of a message on a Voice call (ADR-0064): progress, a result, or silent analysis.
 * They are for the voice, not the reader. The Feed reads every stored, queued or in-memory row without them, and
 * without the analysis they mark, so no reader has to remember to; only the Feed's live changes, which the relay
 * reads, still carry them.
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

// A part of an Agent message as the voice reads it, and its text without the mark; text before any mark is progress.
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

type VoiceKind = VoiceMessage['kind'];

// The section a line leaves the message in: the one its mark opens, else the one it carries on.
function kindAfter(kind: VoiceKind, line: string): VoiceKind {
  const marker = markerOf(line.trimStart());

  return marker ? kinds[marker] : kind;
}

// The text's lines, each with the line break that ends it, so dropping a line drops its break too.
const linesOf = (text: string): string[] => text.split(/(?<=\n)/);

// Text without its analysis: a line that opens with `[ANALYSIS]` and the lines after it, up to a line that opens with another mark. `kind` is the section the text starts in.
function withoutAnalysis(text: string, kind: VoiceKind): string {
  let section = kind;

  return linesOf(text)
    .filter((line) => {
      section = kindAfter(section, line);

      return section !== 'analysis';
    })
    .join('');
}

// The section the text leaves the message in, given the one it starts in.
const kindAtEnd = (text: string, kind: VoiceKind): VoiceKind =>
  linesOf(text).reduce(kindAfter, kind);

// A mark that opens a line after the first, with the spaces after it; the line's indent stays.
const lineMarker = /(^|\n)([ \t]*)\[(?:STATUS|COMPLETE|ANALYSIS)\][ \t]*/g;

/*
 * Text without its marks: the one that opens the message, with the space after it, and one that opens any later line,
 * such as a paragraph of analysis after progress. A mark inside a line is the Agent's own words and stays. `opening`
 * says the text starts the message, so a mark at its start is the message's own.
 */
function withoutMarks(text: string, opening: boolean): string {
  const marker = opening ? markerOf(text) : undefined;
  const body = marker ? text.slice(marker.length).trimStart() : text;

  return body.replaceAll(lineMarker, '$1$2');
}

// A section being read: its kind, and its lines so far without the mark that opened it.
type OpenSection = { kind: VoiceMessage['kind']; lines: string[] };

// The section a line opens with its mark, or none when the line carries on the one before it.
function opensSection(line: string): OpenSection | undefined {
  const text = line.trimStart();
  const marker = markerOf(text);

  return marker && { kind: kinds[marker], lines: [text.slice(marker.length)] };
}

function addLine(sections: OpenSection[], line: string): OpenSection[] {
  const opened = opensSection(line);

  if (opened) sections.push(opened);
  else sections.at(-1)?.lines.push(line);

  return sections;
}

/*
 * What a message is to the voice, a section at a time. A mark that opens a line starts a section that runs to the next
 * such mark or the end of the message, so a paragraph of analysis inside a result stays silent; text before any mark
 * is progress. Sections with nothing to say are left out.
 */
export const readVoiceSections = (text: string): VoiceMessage[] =>
  text
    .split('\n')
    .reduce(addLine, [{ kind: 'progress', lines: [] }])
    .map(({ kind, lines }) => ({ kind, body: lines.join('\n').trim() }))
    .filter(({ body }) => body.length > 0);

// A whole message as it is read: no analysis, no marks.
const readable = (text: string): string =>
  withoutMarks(withoutAnalysis(text, 'progress'), true);

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

// A row as it is read: an Agent message without its marks and its analysis; any other row as it is.
export function withoutVoiceMarkers<Row extends SessionUpdate>(row: Row): Row {
  if (row.sessionUpdate !== 'agent_message') return row;
  const text = firstText(row.content);

  if (text === undefined) return row;

  return {
    ...row,
    content: withFirstText(row.content, readable(text)),
  };
}

const couldBecomeMark = (text: string): boolean =>
  text.length > 0 &&
  voiceMarkers.some((marker) => marker !== text && marker.startsWith(text));

// How much of the text is known: all of it, unless its last line starts with what could still become a mark.
function knownLength(text: string): number {
  const lineStart = text.lastIndexOf('\n') + 1;
  const line = text.slice(lineStart);
  const start = lineStart + line.length - line.trimStart().length;

  return couldBecomeMark(text.slice(start)) ? start : text.length;
}

/*
 * The visible text of a message that arrives in chunks. A line whose start could still become a mark is held back, so
 * a mark split across chunks never shows, and analysis never shows at all; once a line's start is known the rest of it
 * passes as it comes. Only the last line is read again with each chunk: the lines before it are let go once the
 * message's opening is known.
 */
export class VoiceMarkerStream {
  // The message's text from the start of a line on; the opening line until the opening is known.
  private text = '';
  private opening = true;
  // The section `text` starts in.
  private kind: VoiceKind = 'progress';
  // How much of the visible text of `text` was already given out.
  private shown = 0;

  public push(chunk: string): string {
    this.text += chunk;
    const known = this.text.slice(0, knownLength(this.text));
    const visible = this.visibleOf(known);
    const added = visible.slice(this.shown);
    this.shown = visible.length;
    this.letGoOfLines(visible);

    return added;
  }

  private visibleOf(text: string): string {
    return withoutMarks(withoutAnalysis(text, this.kind), this.opening);
  }

  // An opening that shows nothing yet may still be trimmed, so its lines are kept until it shows something.
  private letGoOfLines(visible: string): void {
    const lineStart = this.text.lastIndexOf('\n') + 1;

    if (lineStart === 0 || visible.length === 0) return;
    const before = this.text.slice(0, lineStart);
    this.shown -= this.visibleOf(before).length;
    this.kind = kindAtEnd(before, this.kind);
    this.text = this.text.slice(lineStart);
    this.opening = false;
  }
}
