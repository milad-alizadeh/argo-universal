import { attr, count, type AdfNode } from './adf-node';

// ADF's inline nodes and marks as Markdown: text and its marks, breaks, mentions, emoji, cards, dates and statuses.
type Mark = (value: string, mark: AdfNode) => string;

const linked: Mark = (value, mark) => {
  const href = attr(mark, 'href');

  return href ? `[${value}](${href})` : value;
};

const wrapped =
  (edge: string): Mark =>
  (value) =>
    `${edge}${value}${edge}`;

const marks = new Map<string, Mark>([
  ['strong', wrapped('**')],
  ['em', wrapped('_')],
  ['strike', wrapped('~~')],
  ['code', wrapped('`')],
  ['link', linked],
]);

const marked = (value: string, mark: AdfNode): string =>
  marks.get(mark.type)?.(value, mark) ?? value;

const dateOf = (node: AdfNode): string => {
  const stamp = count(node, 'timestamp') ?? Number(attr(node, 'timestamp'));

  return Number.isFinite(stamp)
    ? new Date(stamp).toISOString().slice(0, 10)
    : '';
};

const cardOf = (node: AdfNode): string => {
  const url = attr(node, 'url');

  return url ? `<${url}>` : '';
};

type Write = (node: AdfNode) => string;

const textOf: Write = (node) => node.marks.reduce(marked, node.text);

const lineBreak: Write = () => '  \n';

// A mention, an emoji or a status says what it shows as its `text`.
const named =
  (fallback: string): Write =>
  (node) =>
    attr(node, 'text') ?? attr(node, 'shortName') ?? fallback;

const writers = new Map<string, Write>([
  ['text', textOf],
  ['hardBreak', lineBreak],
  ['mention', named('@someone')],
  ['emoji', named('')],
  ['inlineCard', cardOf],
  ['date', dateOf],
  ['status', named('')],
]);

// The text of a node's inline children, each as Markdown; one this does not know keeps its own children's text.
export const inline = (node: AdfNode): string =>
  node.content
    .map((child) => (writers.get(child.type) ?? inline)(child))
    .join('');
