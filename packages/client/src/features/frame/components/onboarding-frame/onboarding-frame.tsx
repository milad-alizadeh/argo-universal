import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { ContentLayout } from '#lib/product/content-layout';
import { PaneBanner, WindowDragStrip } from '../../scaffold/scaffold-chrome';

export interface OnboardingFrameProps {
  // The connection banner, as on the full shell.
  banner?: ReactNode;
  children: ReactNode;
}

// A Server with no Projects yet: Onboarding fills the window, with no rail or list until the first Project arrives.
export function OnboardingFrame({
  banner,
  children,
}: OnboardingFrameProps): React.JSX.Element {
  return (
    <View testID="desktop-shell" className="flex-1 overflow-hidden bg-content">
      <WindowDragStrip />
      <View testID="desktop-detail" className="flex-1">
        <ContentLayout className="overflow-hidden">{children}</ContentLayout>
      </View>
      <PaneBanner>{banner}</PaneBanner>
    </View>
  );
}
