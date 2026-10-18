import { listSectionMargins } from '@expo/ui/swift-ui/modifiers';
import type { ViewStyle } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import { paneLeadingInset, useInIosPane } from './pane-inset';

type SectionModifier = ReturnType<typeof listSectionMargins>;

const leadingMargin = (length: ViewStyle['paddingLeft']): SectionModifier[] =>
  typeof length === 'number'
    ? [listSectionMargins({ edges: 'leading', length })]
    : [];

// The Form would keep a regular-width window's wider leading margin; in an iPad's pane its sections take the bar's.
export function usePaneSectionMargin(): SectionModifier[] {
  const inPane = useInIosPane();
  const { paddingLeft } = useResolveClassNames(paneLeadingInset);

  return inPane ? leadingMargin(paddingLeft) : [];
}
