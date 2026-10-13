import type * as React from 'react';
import type { ReactNode } from 'react';
import { LiveConnectionBanner } from '#features/connection';
import { GetStartedScreen, useFirstRun } from '#features/setup';
import type { NavigationDestination } from '#lib/product/navigation/context';
import { sectionOf } from '../../../lib/product/navigation/sections';
import {
  DesktopLayoutView,
  type DesktopLayoutViewProps,
} from '../components/desktop-layout-view/desktop-layout-view';
import { FirstRunShell } from '../components/first-run-shell/first-run-shell';
import { useAttentionCount } from '../hooks/use-attention-count';
import { detailDestination } from '../state/detail-destination';
import { useSectionList } from './section-list';

export interface DesktopLayoutProps {
  destination: NavigationDestination;
  children: ReactNode;
}

function useLayoutProps(
  destination: NavigationDestination,
): Pick<DesktopLayoutViewProps, 'list' | 'listHeader' | 'attentionCount'> {
  const { header, list } = useSectionList(
    sectionOf(destination),
    detailDestination(destination),
  );
  return { list, listHeader: header, attentionCount: useAttentionCount() };
}

// The wide window's shell, with the live attention count and the open section's connected list; the drawing is `DesktopLayoutView`.
function FullLayout({
  destination,
  children,
}: DesktopLayoutProps): React.JSX.Element {
  const layoutProps = useLayoutProps(destination);
  return (
    <DesktopLayoutView
      destination={destination}
      {...layoutProps}
      banner={<LiveConnectionBanner />}
    >
      {children}
    </DesktopLayoutView>
  );
}

function FirstRunLayout(): React.JSX.Element {
  return (
    <FirstRunShell banner={<LiveConnectionBanner />}>
      <GetStartedScreen />
    </FirstRunShell>
  );
}

// A Server with no Projects shows Get started on its own in place of Sessions; Settings keep the full shell.
export function DesktopLayout(props: DesktopLayoutProps): React.JSX.Element {
  const firstRun = useFirstRun() && props.destination.to === 'sessions';
  return firstRun ? <FirstRunLayout /> : <FullLayout {...props} />;
}
