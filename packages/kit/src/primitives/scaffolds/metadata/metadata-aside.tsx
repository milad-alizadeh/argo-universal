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

interface Group {
  title: string;
  // The group's fields say what they are by their glyph, so it needs no heading.
  bare: boolean;
  fields: FieldElement[];
}

// A field that leads with a glyph of its own: a status, a person, or a value with an icon.
const hasGlyph = (field: FieldElement): boolean =>
  field.type === MetadataStatus ||
  field.type === MetadataAvatar ||
  (field.type !== MetadataPillsField && field.props.icon !== undefined);

/*
 * Consecutive fields that share a title are one group under one heading, as several blockers are. A lone field with a
 * glyph needs no heading, and the bare ones that follow each other read as one block at the top, as a tracker's
 * status, priority and assignee do.
 */
function groupsOf(children: ReactNode): Group[] {
  const fields = flattenedChildren(children).filter(isValidElement);

  return fields.reduce<Group[]>((groups, element) => {
    const field = element as FieldElement;
    const title = field.props.title ?? '';
    const last = groups.at(-1);

    if (last && !last.bare && last.title === title) last.fields.push(field);
    else groups.push({ title, bare: false, fields: [field] });

    return groups;
  }, []).map(bareIfLoneGlyph);
}

const bareIfLoneGlyph = (group: Group): Group => ({
  ...group,
  bare: group.fields.length === 1 && hasGlyph(group.fields[0] as FieldElement),
});

// The aside: unheaded glyph rows first, then each other group's small heading over its values; a title heads them all.
export function AsideFields({ title, children }: MetadataProps): ReactNode {
  return (
    <View role="group" aria-label={title ?? 'Properties'} className="gap-4">
      {title ? <AsideTitle title={title} /> : null}
      {groupsOf(children).map((group, index) => (
        <AsideGroup key={`${group.title}-${index}`} group={group} />
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

function AsideGroup({ group }: { group: Group }): ReactElement {
  if (group.bare) return <>{group.fields}</>;

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
