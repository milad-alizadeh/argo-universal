import type * as React from 'react';
import type { ReactNode } from 'react';
import { LiveConnectionBanner } from '#features/connection';
import type { NavigationDestination } from '#lib/product/navigation/context';
import { sectionOf } from '../../../lib/product/navigation/sections';
import {
  DesktopLayoutView,
  type DesktopLayoutViewProps,
} from '../components/desktop-layout-view/desktop-layout-view';
import { useAttentionCount } from '../hooks/use-attention-count';
import { detailDestination } from '../state/detail-destination';
import { OnboardingLayout, useOnboardingShown } from './onboarding-layout';
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

export function DesktopLayout(props: DesktopLayoutProps): React.JSX.Element {
  const onboarding = useOnboardingShown(props.destination);

  return onboarding ? <OnboardingLayout /> : <FullLayout {...props} />;
}
