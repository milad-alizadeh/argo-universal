import { Pill } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { IssueLabel } from './github-issues';

// Each label filled with GitHub's own colour, as GitHub shows it. The key is prefixed, so a label named as one of a row's marks, such as "blocked", never shares that mark's key.
export const labelPills = (labels: readonly IssueLabel[]): JSX.Element[] =>
  labels.map((label) => (
    <Pill key={`label-${label.name}`} text={label.name} color={label.color} />
  ));
