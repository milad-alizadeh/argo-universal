import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { Avatar } from '#primitives/content/avatar';
import { Icon } from '#primitives/content/icon';
import { Link } from '#primitives/content/link';
import { Text } from '#primitives/content/text';
import { Pill } from '#primitives/status/pill';
import { StatusDot } from '#primitives/status/status-dot';
import { Metadata } from './metadata';

/*
 * The Issue tracker's real fields for one Issue (#1860's fallback options), in its order: Status, Labels, Blocked by,
 * Assignee, GitHub. Today's Metadata draws them; the options draw the same values another way.
 */
const labels = [
  'bug',
  'area/workbench',
  'spec-0026',
  'good first issue',
  'needs-design',
  'p1',
  'plugin:issue-tracker',
];

const issueRef = `#${1860}`;

const issueUrl = `https://github.com/milad-alizadeh/argo-universal/issues/${1860}`;

const blocker = `#${1856} Frame: full-bleed Screen width, aside and footer`;

const labelPills = labels.map((text) => <Pill key={text} text={text} />);

export function IssueMetadata(): ReactElement {
  return (
    <Metadata>
      <Metadata.StatusDot title="Status" text="Open" tone="success" />
      <Metadata.Pills title="Labels">{labelPills}</Metadata.Pills>
      <Metadata.Label title="Blocked by" text={blocker} icon="refused" />
      <Metadata.Avatar title="Assignee" name="Milad Alizadeh" />
      <Metadata.Link title="GitHub" text={issueRef} href={issueUrl} />
    </Metadata>
  );
}

export interface FallbackField {
  title: string;
  value: ReactNode;
}

function Value(props: { children: ReactNode; lead?: ReactNode }): ReactElement {
  return (
    <View className="min-w-0 flex-row items-center gap-1.5">
      {props.lead}
      <Text role="row" className="min-w-0 shrink">
        {props.children}
      </Text>
    </View>
  );
}

const pills = (
  <View className="min-w-0 flex-row flex-wrap items-center gap-1">
    {labelPills}
  </View>
);

export const issueFields: FallbackField[] = [
  {
    title: 'Status',
    value: <Value lead={<StatusDot tone="success" size="sm" />}>Open</Value>,
  },
  { title: 'Labels', value: pills },
  {
    title: 'Blocked by',
    value: <Value lead={<Icon name="refused" />}>{blocker}</Value>,
  },
  {
    title: 'Assignee',
    value: (
      <Value
        lead={
          <Avatar size="sm" initials="MA" accessibilityLabel="Milad Alizadeh" />
        }
      >
        Milad Alizadeh
      </Value>
    ),
  },
  {
    title: 'GitHub',
    value: (
      <Value>
        <Link label={issueRef} href={issueUrl} />
      </Value>
    ),
  },
];

export const FieldLabel = ({ title }: { title: string }): ReactElement => (
  <Text role="secondary" tone="muted" numberOfLines={1}>
    {title}
  </Text>
);
