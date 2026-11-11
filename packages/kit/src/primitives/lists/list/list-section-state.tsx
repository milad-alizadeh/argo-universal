import type { ReactNode } from 'react';
import type { ListSelection } from '../../../list-context';
import { ListFooter } from '../../../list-footer';
import { sectionKey } from './list-move-model';
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
    ...sectionParts(props, key, footerShown),
  };
}

type SectionParts = Pick<SectionState, 'header' | 'footer'>;

interface DrawnParts {
  // The key and footer choice they were drawn for.
  drawnFor: string;
  parts: SectionParts;
}

const drawnParts = new WeakMap<ListSectionProps, DrawnParts>();

/*
 * A Section drawn again from the same props holds the header and footer it drew, so the List's rows for them read as
 * the same rows and do not draw again.
 */
function sectionParts(
  props: ListSectionProps,
  key: string,
  footerShown: boolean,
): SectionParts {
  const drawnFor = `${key} ${footerShown}`;
  const held = drawnParts.get(props);

  if (held?.drawnFor === drawnFor) return held.parts;

  const parts = {
    header: sectionHeader(props, key),
    footer: sectionFooter(props, key, footerShown),
  };

  drawnParts.set(props, { drawnFor, parts });

  return parts;
}

// A Section's header is where a dragged row lands first in its Section.
function sectionHeader(props: ListSectionProps, key: string): ReactNode {
  if (!hasSectionHeader(props)) return null;

  return (
    <SectionMoveZone sectionKey={sectionKey(key)}>
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
