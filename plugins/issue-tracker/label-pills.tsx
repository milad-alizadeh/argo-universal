import { Pill } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { IssueLabel } from './github-issues';

// Each label filled with GitHub's own colour, as GitHub shows it.
export const labelPills = (labels: readonly IssueLabel[]): JSX.Element[] =>
  labels.map((label) => (
    <Pill key={label.name} text={label.name} color={label.color} />
  ));

// A row shows three labels; the rest fold into one count.
const rowLabels = 3;

export function rowLabelPills(labels: readonly IssueLabel[]): JSX.Element[] {
  const more = labels.length - rowLabels;
  const shown = labelPills(labels.slice(0, rowLabels));

  return more > 0
    ? [...shown, <Pill key="more" text={`+${more}`} tone="muted" />]
    : shown;
}
