import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import { Text } from '@repo/kit/primitives/content/text';
import { Card } from '@repo/kit/primitives/layout/card';
import { InspectorPane } from '@repo/kit/primitives/scaffolds/inspector';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import { useState, type ReactElement } from 'react';
import { View, TextInput } from 'react-native';
import {
  Scaffold,
  type ScaffoldProps,
  type InspectorState,
  type WorkbenchIntent,
} from './scaffold';

type MockState = Pick<
  ScaffoldProps,
  | 'sidebarShown'
  | 'onSidebarShownChange'
  | 'inspectorAvailable'
  | 'workbenchIntent'
  | 'onWorkbenchIntentChange'
  | 'inspectorState'
  | 'onInspectorStateChange'
>;

export function WorkbenchScaffold({
  inspectorOpen = false,
}: {
  inspectorOpen?: boolean;
}): ReactElement {
  const state = useMockState(inspectorOpen);

  return (
    <Scaffold
      {...mockPanes(state.onInspectorStateChange)}
      sizeClass="wide"
      {...state}
    />
  );
}

type WorkbenchState = Pick<
  MockState,
  'inspectorAvailable' | 'workbenchIntent' | 'onWorkbenchIntentChange'
>;

function useWorkbenchState(): WorkbenchState {
  const [workbenchIntent, onWorkbenchIntentChange] =
    useState<WorkbenchIntent>('auto');

  return { inspectorAvailable: true, workbenchIntent, onWorkbenchIntentChange };
}

function useMockState(inspectorOpen: boolean): MockState {
  const [sidebarShown, onSidebarShownChange] = useState(true);

  const [inspectorState, onInspectorStateChange] = useState<InspectorState>(
    inspectorOpen ? 'open' : 'closed',
  );

  return {
    sidebarShown,
    onSidebarShownChange,
    inspectorState,
    onInspectorStateChange,
    ...useWorkbenchState(),
  };
}

type MockPanes = Pick<
  ScaffoldProps,
  'sidebar' | 'list' | 'page' | 'inspector' | 'band'
>;

type SetInspectorState = (state: InspectorState) => void;

const mockPage = (
  <View testID="workbench-feed" className="flex-1">
    <TextInput accessibilityLabel="Draft" defaultValue="Keep my draft" />
  </View>
);

function mockPanes(onInspectorStateChange: SetInspectorState): MockPanes {
  return {
    sidebar: <View className="w-frame-rail" />,
    list: (
      <Screen title="Sessions">
        <Text>Sessions list</Text>
      </Screen>
    ),
    page: mockPage,
    inspector: () => mockInspector(onInspectorStateChange),
    band: mockBand(onInspectorStateChange),
  };
}

function mockInspector(
  onInspectorStateChange: SetInspectorState,
): ReactElement {
  return (
    <InspectorPane
      title="Changes"
      open
      onOpenChange={() => onInspectorStateChange('closed')}
    >
      <Text>Branch files</Text>
    </InspectorPane>
  );
}

function mockBand(
  onInspectorStateChange: SetInspectorState,
): ScaffoldProps['band'] {
  return {
    title: <Text>Session</Text>,
    menu: <IconButton icon="more" accessibilityLabel="More" />,
    workbench: (
      <Card title="Changes" onPress={() => onInspectorStateChange('open')}>
        <Text>2 files</Text>
      </Card>
    ),
    onInspectorToggle: () => onInspectorStateChange('open'),
  };
}
