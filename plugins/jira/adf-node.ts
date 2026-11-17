import { at, list, text, type Json } from './json';

// One node of an ADF tree, read from Jira's JSON once so the writers read typed fields.
export type AdfNode = Readonly<{
  type: string;
  text: string;
  attrs: Json | undefined;
  marks: AdfNode[];
  content: AdfNode[];
}>;

export const adfNode = (json: Json): AdfNode => ({
  type: text(at(json, 'type')) ?? '',
  text: text(at(json, 'text')) ?? '',
  attrs: at(json, 'attrs'),
  marks: list(at(json, 'marks')).map(adfNode),
  content: list(at(json, 'content')).map(adfNode),
});

// A text attribute of the node, such as a link's `href`.
export const attr = (node: AdfNode, name: string): string | null =>
  text(at(node.attrs, name));

// A number attribute, which Jira writes as a number, such as a heading's `level`.
export const count = (node: AdfNode, name: string): number | null => {
  const value = at(node.attrs, name);

  return typeof value === 'number' ? value : null;
};
