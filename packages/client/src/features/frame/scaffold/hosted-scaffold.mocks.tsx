import { InspectorHostContext } from '@repo/kit/primitives/scaffolds/inspector';
import { SizeClass } from '@repo/kit/size-class/size-class';
import type { JSX, PropsWithChildren } from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { ListTitle } from '#lib/product/list-title';
import { WindowBandHostContext } from '#lib/product/window-band';
import { coreNavigationSections } from '../../../lib/product/navigation/sections';
import { FrameRail } from '../components/frame-rail/frame-rail';
import { LayoutListMock } from '../components/layout-list.mocks';
import { useFrameState, type FrameState } from '../frame/frame-state';
import { Scaffold } from './scaffold';

function Rail({ scaffold }: FrameState): JSX.Element {
  return (
    <FrameRail
      items={coreNavigationSections}
      hasSidebar
      attentionCount={0}
      selectedSection="sessions"
      sidebarShown={scaffold.sidebarShown}
      onSidebarShownChange={scaffold.onSidebarShownChange}
      onSectionChange={fn()}
    />
  );
}

type SizedFrame = PropsWithChildren<
  FrameState & { sizeClass: 'compact' | 'wide' }
>;

function HostedScaffold(props: SizedFrame): JSX.Element {
  return (
    <Scaffold
      {...props.scaffold}
      sizeClass={props.sizeClass}
      sidebar={<Rail {...props} />}
      listHeader={<ListTitle>Sessions</ListTitle>}
      list={<LayoutListMock name="Sessions" />}
      page={props.children}
    />
  );
}

// The real Frame state around a props page: its Inspector draws in the hosted column.
export function HostedScaffoldMock({
  children,
}: PropsWithChildren): JSX.Element {
  const state = useFrameState();

  return (
    <View className="flex-1">
      <InspectorHostContext value={state.inspectorHost}>
        <WindowBandHostContext value={state.bandHost}>
          <AdaptiveScaffold {...state}>{children}</AdaptiveScaffold>
        </WindowBandHostContext>
      </InspectorHostContext>
    </View>
  );
}

function AdaptiveScaffold(props: PropsWithChildren<FrameState>): JSX.Element {
  return (
    <SizeClass
      compact={<HostedScaffold {...props} sizeClass="compact" />}
      wide={<HostedScaffold {...props} sizeClass="wide" />}
    />
  );
}
