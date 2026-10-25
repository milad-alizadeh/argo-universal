import type { ReactNode } from 'react';
import { Platform } from 'react-native';
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
