// FieldGroup.Section hides its tile colours, so Android groups stock ListItems with public modifiers.
import { Column } from '@expo/ui';
import * as Material from '@expo/ui/jetpack-compose/modifiers';
import type { ReactElement } from 'react';
import { useResolveClassNames } from 'uniwind';
import {
  NativeText,
  type NativeTextRole,
} from '#primitives/content/native-text';
import { useSidebarList } from '#primitives/fields/field-layout';
import type { GroupedListSectionProps } from './grouped-list-section-props';

const fullWidth = [Material.fillMaxWidth()];

const sectionCorner = 20;

const gutter = 16;

const captionInset = 4;

const captionModifiers = [
  Material.padding(gutter, captionInset, gutter, captionInset),
];

const groupedRows = [
  Material.fillMaxWidth(),
  Material.clip(Material.Shapes.RoundedCorner(sectionCorner)),
];

export function NativeSection(props: GroupedListSectionProps): ReactElement {
  return (
    <Column spacing={8} modifiers={fullWidth}>
      <Caption text={props.title} heading />
      <SectionRows {...props} />
      <SectionFooter {...props} />
    </Column>
  );
}

function SectionRows(props: GroupedListSectionProps): ReactElement {
  const bare = useSidebarList() || drawsNoCard(props);

  return (
    <Column
      spacing={useRowGap(props.textFields)}
      modifiers={bare ? fullWidth : groupedRows}
    >
      {props.children}
    </Column>
  );
}

// Stacked text fields and card-less content keep their full width, unclipped by a card's corners.
const drawsNoCard = (props: GroupedListSectionProps): boolean =>
  Boolean(props.textFields || props.cardless);

function SectionFooter(props: GroupedListSectionProps): ReactElement {
  return (
    <Caption
      text={props.textFields ? undefined : props.footer}
      danger={props.tone === 'danger'}
    />
  );
}

function useRowGap(textFields: boolean | undefined): number {
  const sidebar = useSidebarList();
  const { gap } = useResolveClassNames('gap-4');

  if (textFields) return numericGap(gap);

  return sidebar ? 0 : 2;
}

function numericGap(
  value: ReturnType<typeof useResolveClassNames>['gap'],
): number {
  return typeof value === 'number' ? value : 0;
}

type CaptionProps = { text?: string; heading?: boolean; danger?: boolean };

function Caption(props: CaptionProps): ReactElement | null {
  if (!props.text) return null;

  return (
    <NativeText
      role={captionRole(props.heading)}
      tone={props.danger ? 'danger' : 'muted'}
      modifiers={captionModifiers}
    >
      {props.text}
    </NativeText>
  );
}

const captionRole = (heading: boolean | undefined): NativeTextRole =>
  heading ? 'heading' : 'secondary';
