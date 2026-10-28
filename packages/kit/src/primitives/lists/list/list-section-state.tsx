import type { ReactNode } from 'react';
import type { ListSelection } from '../../../list-context';
import { ListFooter } from '../../../list-footer';
import { SectionMoveZone } from './list-move-zone';
import type { ListSectionProps } from './list-props';
import { hasSectionHeader } from './list-section-actions';
import { SectionHeader } from './list-section-parts';

export interface SectionState {
  key: string;
  // The Section's own `id`, which a move reports.
  id?: string;
  title?: string;
  children: ReactNode;
  selection: ListSelection;
  header: ReactNode;
  footer: ReactNode;
}

// Both declarations prepared by List and sections reached through React use these rules.
export function prepareSection(
  props: ListSectionProps,
  key: string,
  footerShown: boolean,
): SectionState {
  return {
    key,
    id: props.id,
    title: props.title,
    children: props.isExpanded === false ? null : props.children,
    selection: sectionSelection(props),
    header: sectionHeader(props),
    footer: sectionFooter(props, key, footerShown),
  };
}

// A Section's header is where a dragged row lands first in its Section.
function sectionHeader(props: ListSectionProps): ReactNode {
  if (!hasSectionHeader(props)) return null;

  return (
    <SectionMoveZone section={props.id}>
      <SectionHeader {...props} />
    </SectionMoveZone>
  );
}

function sectionSelection(props: ListSectionProps): ListSelection {
  if (!props.selectionMode) return {};

  return {
    selectionMode: props.selectionMode,
    selection: props.selection,
    onSelectionChange: props.onSelectionChange,
  };
}

function sectionFooter(
  props: ListSectionProps,
  key: string,
  footerShown: boolean,
): ReactNode {
  if (!props.footer || !footerShown) return null;

  return (
    <ListFooter id={`${key}:footer`} text={props.footer} tone={props.tone} />
  );
}
