import type * as React from 'react';
import type { ReactNode } from 'react';
import type { NavigationDestination } from '#lib/product/navigation/context';
import { sectionOf } from '../../../lib/product/navigation/sections';
import { DesktopLayoutView } from '../components/desktop-layout-view';
import { useAttentionCount } from '../hooks/use-attention-count';
import { detailDestination } from '../state/detail-destination';
import { useSectionList } from './section-list';

export interface DesktopLayoutProps {
  destination: NavigationDestination;
  children: ReactNode;
}

// The wide window's shell, with the live attention count and the open section's connected list; the drawing is `DesktopLayoutView`.
export function DesktopLayout({
  destination,
  children,
}: DesktopLayoutProps): React.JSX.Element {
  const { header, list } = useSectionList(
    sectionOf(destination),
    detailDestination(destination),
  );
  return (
    <DesktopLayoutView
      destination={destination}
      attentionCount={useAttentionCount()}
      list={list}
      listHeader={header}
    >
      {children}
    </DesktopLayoutView>
  );
}
