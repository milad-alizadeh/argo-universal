import { Pill } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { IssueLabel } from './github-issues';

// Each label in GitHub's own colour, as GitHub shows it.
export const labelPills = (labels: readonly IssueLabel[]): JSX.Element[] =>
  labels.map((label) => (
    <Pill key={label.name} text={label.name} color={label.color} />
  ));
