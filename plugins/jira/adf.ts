import { inline } from './adf-inline';
import { adfNode, attr, count, type AdfNode } from './adf-node';
import type { Json } from './json';

/*
 * Jira Cloud's REST API v3 answers an issue's description in the Atlassian Document Format (ADF), a JSON tree. The
 * detail page draws Markdown, so this turns the tree into Markdown: the blocks a description holds, and the text of
 * anything else, so nothing a person wrote is lost. Media is left out, since the page cannot fetch it.
 */
type Write = (node: AdfNode) => string;

const deepestHeading = 6;

const quoted = (value: string): string =>
  value
    .split('\n')
    .map((line) => (line ? `> ${line}` : '>'))
    .join('\n');

const tableLine = (cells: string[]): string => `| ${cells.join(' | ')} |`;

const indentedBy =
  (prefix: string) =>
  (line: string, index: number): string =>
    index === 0 ? line : `${' '.repeat(prefix.length)}${line}`;

function listItem(item: AdfNode, prefix: string): string {
  const lines = blocks(item, '\n').split('\n');

  return `${prefix}${lines.map(indentedBy(prefix)).join('\n')}`;
}

const listOf =
  (ordered: boolean): Write =>
  (node) => {
    const start = count(node, 'order') ?? 1;

    return node.content
      .map((item, index) =>
        listItem(item, ordered ? `${start + index}. ` : '- '),
      )
      .join('\n');
  };

function heading(node: AdfNode): string {
  const level = count(node, 'level') ?? 1;
  const depth = Math.min(Math.max(level, 1), deepestHeading);

  return `${'#'.repeat(depth)} ${inline(node)}`;
}

const codeBlock: Write = (node) =>
  `\`\`\`${attr(node, 'language') ?? ''}\n${node.content.map((child) => child.text).join('')}\n\`\`\``;

const task: Write = (item) =>
  `- [${attr(item, 'state') === 'DONE' ? 'x' : ' '}] ${inline(item)}`;

const cellText: Write = (cell) =>
  blocks(cell, ' ').replaceAll('|', '\\|').replaceAll('\n', ' ');

function table(node: AdfNode): string {
  const [head, ...body] = node.content.map((row) => row.content.map(cellText));

  if (!head) return '';

  return [
    tableLine(head),
    tableLine(head.map(() => '---')),
    ...body.map(tableLine),
  ].join('\n');
}

const taskList: Write = (node) => node.content.map(task).join('\n');

const quote: Write = (node) => quoted(blocks(node));

const rule: Write = () => '---';

const media: Write = () => '';

const writers = new Map<string, Write>([
  ['paragraph', inline],
  ['heading', heading],
  ['bulletList', listOf(false)],
  ['orderedList', listOf(true)],
  ['taskList', taskList],
  ['codeBlock', codeBlock],
  ['blockquote', quote],
  ['panel', quote],
  ['rule', rule],
  ['table', table],
  ['mediaSingle', media],
  ['mediaGroup', media],
]);

// A node this does not know, such as an expand or a layout, keeps its blocks, or else its text.
const unknown: Write = (node) =>
  node.content.some((child) => writers.has(child.type))
    ? blocks(node)
    : inline(node);

const block: Write = (node) => (writers.get(node.type) ?? unknown)(node);

function blocks(node: AdfNode, gap = '\n\n'): string {
  return node.content
    .map(block)
    .filter((part) => part !== '')
    .join(gap);
}

// A description as Markdown: an ADF document, or plain text as some apps write it; none is empty.
export function adfMarkdown(description: Json | undefined): string {
  if (typeof description === 'string') return description;

  return description ? blocks(adfNode(description)).trim() : '';
}
