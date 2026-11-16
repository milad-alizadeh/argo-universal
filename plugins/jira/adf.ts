import { at, list, text } from './json';

/*
 * Jira Cloud's REST API v3 answers an issue's description in the Atlassian Document Format (ADF), a JSON tree. The
 * detail page draws Markdown, so this turns the tree into Markdown: the blocks and marks a description holds, and the
 * text of anything else, so nothing a person wrote is lost.
 */
type Node = unknown;

const content = (node: Node): unknown[] => list(at(node, 'content'));

const typeOf = (node: Node): string => text(at(node, 'type')) ?? '';

const attr = (node: Node, name: string): unknown => at(node, 'attrs', name);

// A mark wraps the text it is on; a link needs its address.
function marked(value: string, mark: unknown): string {
  switch (typeOf(mark)) {
    case 'strong':
      return `**${value}**`;
    case 'em':
      return `_${value}_`;
    case 'strike':
      return `~~${value}~~`;
    case 'code':
      return `\`${value}\``;
    case 'link': {
      const href = text(attr(mark, 'href'));

      return href ? `[${value}](${href})` : value;
    }
    default:
      return value;
  }
}

function inlineText(node: Node): string {
  switch (typeOf(node)) {
    case 'text':
      return list(at(node, 'marks')).reduce<string>(
        marked,
        text(at(node, 'text')) ?? '',
      );
    case 'hardBreak':
      return '  \n';
    case 'mention':
      return text(attr(node, 'text')) ?? '@someone';
    case 'emoji':
      return text(attr(node, 'text')) ?? text(attr(node, 'shortName')) ?? '';
    case 'inlineCard': {
      const url = text(attr(node, 'url'));

      return url ? `<${url}>` : '';
    }
    case 'date': {
      const stamp = Number(attr(node, 'timestamp'));

      return Number.isFinite(stamp)
        ? new Date(stamp).toISOString().slice(0, 10)
        : '';
    }
    case 'status':
      return text(attr(node, 'text')) ?? '';
    default:
      return inline(node);
  }
}

const inline = (node: Node): string => content(node).map(inlineText).join('');

const indented = (value: string, prefix: string): string =>
  value
    .split('\n')
    .map((line, index) =>
      index === 0 ? line : `${' '.repeat(prefix.length)}${line}`,
    )
    .join('\n');

function listItems(node: Node, ordered: boolean): string {
  const start = Number(attr(node, 'order') ?? 1);

  return content(node)
    .map((item, index) => {
      const prefix = ordered ? `${start + index}. ` : '- ';

      return `${prefix}${indented(blocks(item, '\n'), prefix)}`;
    })
    .join('\n');
}

function codeBlock(node: Node): string {
  const language = text(attr(node, 'language')) ?? '';
  const code = content(node)
    .map((child) => text(at(child, 'text')) ?? '')
    .join('');

  return `\`\`\`${language}\n${code}\n\`\`\``;
}

const quoted = (value: string): string =>
  value
    .split('\n')
    .map((line) => (line ? `> ${line}` : '>'))
    .join('\n');

const cellText = (cell: Node): string =>
  blocks(cell, ' ').replaceAll('|', '\\|').replaceAll('\n', ' ');

function table(node: Node): string {
  const rows = content(node).map((row) => content(row).map(cellText));
  const [head, ...body] = rows;

  if (!head) return '';

  const line = (cells: string[]): string => `| ${cells.join(' | ')} |`;

  return [line(head), line(head.map(() => '---')), ...body.map(line)].join(
    '\n',
  );
}

function block(node: Node): string {
  switch (typeOf(node)) {
    case 'paragraph':
      return inline(node);
    case 'heading': {
      const level = Math.min(Math.max(Number(attr(node, 'level')) || 1, 1), 6);

      return `${'#'.repeat(level)} ${inline(node)}`;
    }
    case 'bulletList':
      return listItems(node, false);
    case 'orderedList':
      return listItems(node, true);
    case 'taskList':
      return content(node)
        .map(
          (item) =>
            `- [${attr(item, 'state') === 'DONE' ? 'x' : ' '}] ${inline(item)}`,
        )
        .join('\n');
    case 'codeBlock':
      return codeBlock(node);
    case 'blockquote':
    case 'panel':
      return quoted(blocks(node));
    case 'rule':
      return '---';
    case 'table':
      return table(node);
    case 'mediaSingle':
    case 'mediaGroup':
      return '';
    default:
      return content(node).length > 0 ? blocks(node) : inlineText(node);
  }
}

function blocks(node: Node, gap = '\n\n'): string {
  return content(node)
    .map(block)
    .filter((part) => part !== '')
    .join(gap);
}

// A description as Markdown: an ADF document, or plain text as older issues and some apps write it; nothing is empty.
export function adfMarkdown(description: unknown): string {
  if (typeof description === 'string') return description;

  return blocks(description).trim();
}
