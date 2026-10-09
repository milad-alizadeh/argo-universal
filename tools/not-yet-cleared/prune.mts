import {
  applyEdits,
  type Edit,
  findNodeAtLocation,
  modify,
  type Node,
  parseTree,
} from 'jsonc-parser';
import type { Entry } from './document.mts';
import { countFindings, type Finding } from './findings.mts';

function nodeAt(text: string, path: (string | number)[]): Node {
  const tree = parseTree(text, [], { allowTrailingComma: true });
  const node = tree && findNodeAtLocation(tree, path);
  if (!node) throw new Error(`Missing waiver node ${path.join('.')}`);
  return node;
}

function commentStart(text: string, offset: number): number {
  const lineStart = text.lastIndexOf('\n', offset - 1) + 1;
  if (text.slice(lineStart, offset).trim() !== '') return offset;
  const previousStart = text.lastIndexOf('\n', lineStart - 2) + 1;
  return text.slice(previousStart, lineStart).trim().startsWith('//')
    ? previousStart
    : lineStart;
}

function entryEnd(text: string, offset: number): number {
  const suffix = /^[ \t]*,?[ \t]*(?:\r?\n)?/.exec(text.slice(offset));
  return offset + (suffix?.[0].length ?? 0);
}

function removeEntry(text: string, index: number): string {
  const node = nodeAt(text, ['overrides', index]);
  const start = commentStart(text, node.offset);
  const end = entryEnd(text, node.offset + node.length);
  const siblings = nodeAt(text, ['overrides']).children ?? [];
  const edited = text.slice(0, start) + text.slice(end);
  if (siblings[index + 1]) return edited;
  return removePreviousComma(edited, siblings[index - 1]);
}

function removePreviousComma(
  edited: string,
  previous: Node | undefined,
): string {
  if (!previous) return edited;
  const comma = previous.offset + previous.length;
  return (
    edited.slice(0, comma) + edited.slice(comma).replace(/^([ \t]*),/, '$1')
  );
}

function pruneEntry(
  text: string,
  removal: { index: number; stale: string[]; entry: Entry },
): string {
  const { index, stale, entry } = removal;
  if (stale.length === Object.keys(entry.rules).length)
    return removeEntry(text, index);
  return stale.reduce(
    (edited, rule): string => removeRule(edited, index, rule),
    text,
  );
}

function removeRule(text: string, index: number, rule: string): string {
  const rules = nodeAt(text, ['overrides', index, 'rules']);
  const edits = modify(
    text,
    ['overrides', index, 'rules', rule],
    undefined,
    {},
  );
  const prefix = rulePrefix(text, rules);
  return applyEdits(text, preserveRulePrefix(edits, rules.offset + 1, prefix));
}

function preserveRulePrefix(
  edits: Edit[],
  offset: number,
  prefix: string,
): Edit[] {
  return edits.map((edit): Edit => ({
    ...edit,
    content: edit.offset === offset ? prefix : edit.content,
  }));
}

function rulePrefix(text: string, rules: Node): string {
  const first = rules.children?.[0];
  if (!first) throw new Error('Missing rules in waiver entry');
  return text.slice(rules.offset + 1, first.offset);
}

export function pruneWaivers(
  text: string,
  entries: Entry[],
  findings: Finding[],
): string {
  return entries.reduceRight((edited, entry, index): string => {
    if (Object.keys(entry.rules).length === 0)
      return removeEntry(edited, index);
    const stale = Object.keys(entry.rules).filter(
      (rule): boolean => countFindings(findings, entry.files[0], rule) === 0,
    );
    if (stale.length === 0) return edited;
    return pruneEntry(edited, { index, stale, entry });
  }, text);
}
