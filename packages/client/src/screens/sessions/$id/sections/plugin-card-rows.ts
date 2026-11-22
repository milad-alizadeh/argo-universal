import type { WireNode } from '@repo/contracts/plugins/wire';

// One line a Plugin card's page shows, as a phone's Workbench sheet draws it: a native row with its value at the end.
export interface PluginCardLine {
  title: string;
  value?: string;
}

// Rows the kit draws with a title and an optional value; the sheet reads them as they are.
const rowTypes = new Set(['FieldGroup.Link', 'FieldGroup.Value', 'ListItem']);

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

const nested = ({ children, slots }: WireNode): WireNode[] => [
  ...children,
  ...Object.values(slots).flat(),
];

function rowLine({ props }: WireNode): PluginCardLine[] {
  const title = text(props.title);

  if (!title) return [];

  const value = text(props.value) ?? text(props.subtitle);

  return [value ? { title, value } : { title }];
}

// Every row the page draws, in order; a row's own content is not read again.
const rows = (node: WireNode): PluginCardLine[] =>
  rowTypes.has(node.type) ? rowLine(node) : nested(node).flatMap(rows);

function texts(node: WireNode): PluginCardLine[] {
  if (node.type !== 'Text') return nested(node).flatMap(texts);

  const title = text(node.props.children);

  return title ? [{ title }] : [];
}

/*
 * The lines a Plugin card's page shows, for a phone's Workbench sheet, which draws a card's content as native rows
 * (ADR-0042) and cannot hold the Plugin's own drawing. The page's rows when it draws any, else each Text it draws;
 * none before the page answers.
 */
export function pluginCardLines(root: WireNode | null): PluginCardLine[] {
  if (!root) return [];

  const found = rows(root);

  return found.length ? found : texts(root);
}
