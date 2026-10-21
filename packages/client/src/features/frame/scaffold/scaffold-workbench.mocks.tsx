import { useState, type ReactElement } from 'react';
import { View, TextInput } from 'react-native';
import { IconButton } from '#primitives/actions/icon-button';
import { Text } from '#primitives/content/text';
import { Card } from '#primitives/layout/card';
import { InspectorPane } from '#primitives/scaffolds/inspector';
import { Scaffold, type ScaffoldProps, type InspectorState } from './scaffold';

type MockState = Pick<
  ScaffoldProps,
  | 'sidebarShown'
  | 'onSidebarShownChange'
  | 'workbenchShown'
  | 'onWorkbenchShownChange'
  | 'inspectorState'
  | 'onInspectorStateChange'
>;

export function WorkbenchScaffold({
  stageOpen = false,
}: {
  stageOpen?: boolean;
}): ReactElement {
  const state = useMockState(stageOpen);

  return (
    <Scaffold
      {...mockPanes(state.onInspectorStateChange)}
      sizeClass="wide"
      {...state}
    />
  );
}

function useMockState(stageOpen: boolean): MockState {
  const [sidebarShown, onSidebarShownChange] = useState(true);
  const [workbenchShown, onWorkbenchShownChange] = useState<boolean>();

  const [inspectorState, onInspectorStateChange] = useState<InspectorState>(
    stageOpen ? 'open' : 'closed',
  );

  return {
    sidebarShown,
    onSidebarShownChange,
    workbenchShown,
    onWorkbenchShownChange,
    inspectorState,
    onInspectorStateChange,
  };
}

type MockPanes = Pick<
  ScaffoldProps,
  'sidebar' | 'listHeader' | 'list' | 'page' | 'inspector' | 'band'
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
    listHeader: <Text>Sessions</Text>,
    list: <Text>Sessions list</Text>,
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
    onStageToggle: () => onInspectorStateChange('open'),
  };
}
