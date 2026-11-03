import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';
import { flattenedChildren } from '../../../flattened-children';
import {
  MetadataAvatar,
  MetadataPillsField,
  MetadataStatus,
} from './metadata-parts';
import type { MetadataProps } from './metadata-props';

type FieldElement = ReactElement<{ title?: string; icon?: string }>;

// Metadata's wire children are fields alone, each with its title and, for some, an icon.
const isField = (node: ReactNode): node is FieldElement =>
  isValidElement<{ title?: string; icon?: string }>(node);

interface Group {
  title: string;
  // The group's fields say what they are by their glyph, so it needs no heading.
  bare: boolean;
  fields: FieldElement[];
}

const glyphFields = new Set<unknown>([MetadataStatus, MetadataAvatar]);

// A Pills field's icon heads its Pills; any other field's icon leads its value.
const leadsWithIcon = (field: FieldElement): boolean =>
  field.type !== MetadataPillsField && field.props.icon !== undefined;

// A field that leads with a glyph of its own: a status, a person, or a value with an icon.
const hasGlyph = (field: FieldElement): boolean =>
  glyphFields.has(field.type) || leadsWithIcon(field);

/*
 * Consecutive fields that share a title are one group under one heading, as several blockers are. A lone field with a
 * glyph needs no heading, and the bare ones that follow each other read as one block at the top, as a tracker's
 * status, priority and assignee do.
 */
function groupsOf(children: ReactNode): Group[] {
  const groups: Group[] = [];

  for (const field of flattenedChildren(children).filter(isField))
    addField(groups, field);

  return groups.map(bareIfLoneGlyph);
}

const titleOf = (field: FieldElement): string => field.props.title ?? '';

function addField(groups: Group[], field: FieldElement): void {
  const title = titleOf(field);
  const last = groups.at(-1);

  if (last?.title === title) last.fields.push(field);
  else groups.push({ title, bare: false, fields: [field] });
}

function bareIfLoneGlyph(group: Group): Group {
  const [only, ...rest] = group.fields;

  return {
    ...group,
    bare: rest.length === 0 && only !== undefined && hasGlyph(only),
  };
}

// A group's key is its first field's, which Children.toArray made unique.
const groupKey = (group: Group): string =>
  String(group.fields[0]?.key ?? group.title);

// The aside: unheaded glyph rows first, then each other group's small heading over its values; a title heads them all.
export function AsideFields({ title, children }: MetadataProps): ReactNode {
  return (
    <View role="group" aria-label={title ?? 'Properties'} className="gap-4">
      {title ? <AsideTitle title={title} /> : null}
      {groupsOf(children).map((group) => (
        <AsideGroup key={groupKey(group)} group={group} />
      ))}
    </View>
  );
}

function AsideTitle({ title }: { title: string }): ReactElement {
  return (
    <Text role="heading" accessibilityRole="heading" aria-level={2}>
      {title}
    </Text>
  );
}

function AsideGroup({ group }: { group: Group }): ReactNode {
  if (group.bare) return group.fields;

  return (
    <View className="gap-1">
      <Text role="secondary" tone="muted" numberOfLines={1}>
        {group.title}
      </Text>
      {group.fields}
    </View>
  );
}

// Under the title: one wrapping row of Pills, each a field.
export function PillFields({ title, children }: MetadataProps): ReactNode {
  return (
    <View
      role="group"
      aria-label={title ?? 'Properties'}
      className="min-w-0 flex-row flex-wrap items-center gap-1.5"
    >
      {children}
    </View>
  );
}
