import type { Tone } from '@repo/kit/primitives/content/text';
import type { ShellLine, ShellSpan } from './shell-output-lines';

// What a command often prints without colour, toned as a terminal theme might: links, files, and the words that say how a step went.
const marks = new RegExp(
  [
    String.raw`(?<link>https?://[^\s'"<>]*[^\s'"<>.,;:!?)\]])`,
    String.raw`(?<=^|[\s'"(=\[])(?<path>(?:~|\.{1,2})?/[\w.@+~-]+(?:/[\w.@+~-]+)*/?(?::\d+)*|[\w.@-]+(?:/[\w.@-]+)+\.[A-Za-z]\w*(?::\d+)*)`,
    String.raw`\b(?<danger>errors?|err|failed|failures?|fail|fatal|exception|panic)\b`,
    String.raw`\b(?<warning>warnings?|warn|deprecated)\b`,
    String.raw`(?<success>[✓✔]|\bpassed\b|\bsucceeded\b)`,
  ].join('|'),
  'giu',
);

const markTones = [
  ['link', 'info'],
  ['path', 'done'],
  ['danger', 'danger'],
  ['warning', 'warning'],
  ['success', 'success'],
] as const satisfies readonly (readonly [string, Tone])[];

const toneOf = (match: RegExpExecArray): Tone | undefined =>
  markTones.find(([group]) => match.groups?.[group])?.[1];

function addPlain(spans: ShellSpan[], text: string): void {
  if (text) spans.push({ text });
}

function markedSpans(text: string): ShellSpan[] {
  const spans: ShellSpan[] = [];
  let from = 0;

  for (const match of text.matchAll(marks)) {
    const tone = toneOf(match);

    addPlain(spans, text.slice(from, match.index));
    spans.push(tone ? { text: match[0], tone } : { text: match[0] });
    from = match.index + match[0].length;
  }

  addPlain(spans, text.slice(from));

  return spans;
}

// A line the command coloured keeps its own colours; an uncoloured one has its links, files and outcome words marked.
export function markedLine(spans: ShellLine): ShellLine {
  if (spans.length === 0 || spans.some((span) => span.tone)) return spans;

  return markedSpans(spans.map((span) => span.text).join(''));
}
