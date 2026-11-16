import type { ReactElement, ReactNode } from 'react';
import {
  PropertyAvatar,
  PropertyLabel,
  PropertyLink,
  PropertyPillsField,
  PropertyStatus,
} from './property-parts';
import { valueParts, type ValuePart } from './property-value-parts';

type Part<Kind extends ValuePart['kind']> = Extract<ValuePart, { kind: Kind }>;

interface Drawn<Kind extends ValuePart['kind']> {
  title: string;
  part: Part<Kind>;
}

// Words a StatusDot leads are a status; any other words are a label, after their icon.
function TextField({ title, part }: Drawn<'text'>): ReactElement {
  const own = { title, accessibilityLabel: part.spoken, text: part.text };

  return part.lead.tone ? (
    <PropertyStatus {...own} tone={part.lead.tone} />
  ) : (
    <PropertyLabel {...own} icon={part.lead.icon} />
  );
}

function wordsField(title: string, part: Part<'text' | 'link'>): ReactElement {
  if (part.kind === 'text')
    return <TextField key={part.key} title={title} part={part} />;

  return (
    <PropertyLink
      key={part.key}
      title={title}
      link={part.link}
      icon={part.lead.icon}
    />
  );
}

function peopleOrPills(
  title: string,
  part: Part<'avatar' | 'pills'>,
): ReactElement {
  if (part.kind === 'avatar')
    return <PropertyAvatar key={part.key} title={title} avatar={part.avatar} />;

  return (
    <PropertyPillsField
      key={part.key}
      title={title}
      pills={part.pills}
      icon={part.lead.icon}
    />
  );
}

const fieldOf = (title: string, part: ValuePart): ReactElement =>
  part.kind === 'text' || part.kind === 'link'
    ? wordsField(title, part)
    : peopleOrPills(title, part);

export interface ValueRow {
  title: string;
  value?: string;
  children?: ReactNode;
}

// A read-only row as the fields its value is made of, each named by the row's title, in order; each key starts with the row's.
export function valueFields(row: ValueRow, key: string): ReactElement[] {
  return valueParts(row.children, row.value).map((part) =>
    fieldOf(row.title, { ...part, key: `${key}:${part.key}` }),
  );
}
