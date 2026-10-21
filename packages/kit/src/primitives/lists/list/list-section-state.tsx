import type { ReactElement, ReactNode } from 'react';
import { Platform } from 'react-native';
import {
  FooterProvider,
  type SectionFooter,
} from '#primitives/fields/field-description';
import type { ListSelection } from '../../../list-context';
import { ListFooter } from '../../../list-footer';
import type { ListSectionProps } from './list-props';
import { hasSectionHeader, SectionHeader } from './list-section-parts';

export interface SectionState {
  key: string;
  children: ReactNode;
  selection: ListSelection;
  header: ReactNode;
  footer: ReactNode;
  description: SectionFooter | undefined;
}

// Both declarations prepared by List and sections reached through React use these rules.
export function prepareSection(
  props: ListSectionProps,
  key: string,
): SectionState {
  return {
    key,
    children: props.isExpanded === false ? null : props.children,
    selection: sectionSelection(props),
    header: hasSectionHeader(props) ? <SectionHeader {...props} /> : null,
    footer: sectionFooter(props, key),
    description: sectionDescription(props, key),
  };
}

function sectionSelection(props: ListSectionProps): ListSelection {
  if (!props.selectionMode) return {};

  return {
    selectionMode: props.selectionMode,
    selection: props.selection,
    onSelectionChange: props.onSelectionChange,
  };
}

function sectionFooter(props: ListSectionProps, key: string): ReactNode {
  if (!props.footer || Platform.OS === 'android') return null;

  return (
    <ListFooter id={`${key}:footer`} text={props.footer} tone={props.tone} />
  );
}

export function SectionContent({
  section,
  children,
}: {
  section: SectionState;
  children: ReactNode;
}): ReactElement {
  return (
    <FooterProvider value={section.description}>{children}</FooterProvider>
  );
}

function sectionDescription(
  props: ListSectionProps,
  key: string,
): SectionFooter | undefined {
  return props.footer
    ? { id: `${key}:footer`, failure: props.tone === 'danger' }
    : undefined;
}
