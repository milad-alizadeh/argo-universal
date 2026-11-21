import { InspectorPlaceOffer } from '@repo/kit/primitives/scaffolds/inspector';
import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import {
  coreNavigationSections,
  type CoreSection,
} from '../../../lib/product/navigation/sections';
import { WindowBandProvider } from '../../../lib/product/window-band';
import { FrameRail } from '../components/frame-rail/frame-rail';
import { Scaffold } from '../scaffold/scaffold';
import { useFrameState } from './frame-state';

type FramePagePreviewProps = {
  list: ReactNode;
  page: ReactNode;
  section: CoreSection;
};

const ignore = (): void => {};

// The normal Frame around fixture views, including the places its page claims in the window's band.
export function FramePagePreview({
  list,
  page,
  section,
}: FramePagePreviewProps): ReactElement {
  const { scaffold, bandPlaces, inspectorPlace } = useFrameState();

  return (
    <View className="flex-1">
      <InspectorPlaceOffer value={inspectorPlace}>
        <WindowBandProvider places={bandPlaces}>
          <Scaffold
            {...scaffold}
            sizeClass="wide"
            sidebar={
              <FrameRail
                items={coreNavigationSections}
                selectedSection={section}
                hasSidebar
                attentionCount={0}
                sidebarShown={scaffold.sidebarShown}
                onSectionChange={ignore}
                onSidebarShownChange={scaffold.onSidebarShownChange}
              />
            }
            list={list}
            page={page}
          />
        </WindowBandProvider>
      </InspectorPlaceOffer>
    </View>
  );
}
