import type { SessionRowItem } from '@argo/plugin-kit';
import { statuses } from './issue-status-view';
import type { IssueSummary } from './issue-summary';
import type { IssueLink } from './tracker-storage';

// An Issue a Session is attached to, with the summary stored for it so far.
export type Linked = { link: IssueLink; summary: IssueSummary | null };

// Where an Issue's page opens: the Plugin page the item's press goes to.
export type PathOf = (link: IssueLink) => string;

// A Session row holds at most this many items from one Plugin (the Slot's own limit).
const rowItemLimit = 8;

const tooltipLimit = 200;

const issueIcon = { sf: 'record.circle', material: 'adjust' } as const;

const stateText = ({ status, closedAs }: IssueSummary): string =>
  closedAs === 'not-planned' ? 'Not planned' : statuses[status].text;

// One item per Issue the Session is attached to, the most recent first.
export const rowItems = (pathOf: PathOf, entries: Linked[]): SessionRowItem[] =>
  entries.slice(0, rowItemLimit).map((entry) => rowItem(pathOf, entry));

// The Session bar holds one line: the Issue attached most recently.
export const barItems = (
  pathOf: PathOf,
  [latest]: Linked[],
): SessionRowItem[] => (latest ? [barItem(pathOf, latest)] : []);

// The Issue's number, in the state's tone; its title and state are the tooltip once they have loaded.
const rowItem = (
  pathOf: PathOf,
  { link, summary }: Linked,
): SessionRowItem => ({
  icon: issueIcon,
  text: `#${link.number}`,
  action: { path: pathOf(link) },
  ...rowDetails(link, summary),
});

function rowDetails(
  link: IssueLink,
  summary: IssueSummary | null,
): Pick<SessionRowItem, 'tone' | 'tooltip'> {
  if (!summary) return { tooltip: `Issue #${link.number}` };

  return {
    tone: statuses[summary.status].tone,
    tooltip: `${summary.title} · ${stateText(summary)}`.slice(0, tooltipLimit),
  };
}

// "#412 · Open"; only the number until the state has loaded. The bar has no tone and no tooltip.
const barItem = (
  pathOf: PathOf,
  { link, summary }: Linked,
): SessionRowItem => ({
  icon: issueIcon,
  text: summary ? `#${link.number} · ${stateText(summary)}` : `#${link.number}`,
  action: { path: pathOf(link) },
});
