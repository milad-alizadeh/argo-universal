import type { ContentBlock, SessionUpdate } from '@repo/contracts';

/*
 * The marks an Agent puts at the start of a message on a Conversation (ADR-0064): progress, a result, or silent analysis.
 * They are for the voice, not the reader. The Feed reads every stored, queued or in-memory row without them, and
 * without the analysis they mark, so no reader has to remember to; only the Feed's live changes, which the relay
 * reads, still carry them.
 */
export const voiceMarkers = ['[STATUS]', '[COMPLETE]', '[ANALYSIS]'] as const;

type VoiceMarker = (typeof voiceMarkers)[number];

// The instruction the first Prompt of a Conversation carries lives in the contracts, so an App can read a Prompt without it.
export { withVoiceInstruction, withoutVoiceInstruction } from '@repo/contracts';

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

export const markerOf = (text: string): VoiceMarker | undefined =>
  voiceMarkers.find((marker) => text.startsWith(marker));

export type VoiceKind = VoiceMessage['kind'];

// The section a line leaves the message in: the one its mark opens, else the one it carries on.
export function kindAfter(kind: VoiceKind, line: string): VoiceKind {
  const marker = markerOf(line.trimStart());

  return marker ? kinds[marker] : kind;
}

// The text's lines, each with the line break that ends it, so dropping a line drops its break too.
const linesOf = (text: string): string[] => text.split(/(?<=\n)/);

// Text without its analysis: a line that opens with `[ANALYSIS]` and the lines after it, up to a line that opens with another mark. `kind` is the section the text starts in.
export function withoutAnalysis(text: string, kind: VoiceKind): string {
  let section = kind;

  return linesOf(text)
    .filter((line) => {
      section = kindAfter(section, line);

      return section !== 'analysis';
    })
    .join('');
}

// The section the text leaves the message in, given the one it starts in.
export const kindAtEnd = (text: string, kind: VoiceKind): VoiceKind =>
  linesOf(text).reduce(kindAfter, kind);

// A mark that opens a line after the first, with the spaces after it; the line's indent stays.
const lineMarker = /(^|\n)([ \t]*)\[(?:STATUS|COMPLETE|ANALYSIS)\][ \t]*/g;

/*
 * Text without its marks: the one that opens the message, with the space after it, and one that opens any later line,
 * such as a paragraph of analysis after progress. A mark inside a line is the Agent's own words and stays. `opening`
 * says the text starts the message, so a mark at its start is the message's own.
 */
export function withoutMarks(text: string, opening: boolean): string {
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
export const readConversationSections = (text: string): VoiceMessage[] =>
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
