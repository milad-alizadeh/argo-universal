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

interface WorkbenchScaffoldProps {
  inspectorOpen?: boolean;
  overflowing?: boolean;
}

export function WorkbenchScaffold({
  inspectorOpen = false,
  overflowing = false,
}: WorkbenchScaffoldProps): ReactElement {
  const state = useMockState(inspectorOpen);

  return (
    <Scaffold
      {...mockPanes(state.onInspectorStateChange, overflowing)}
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

const sessionsList = (
  <Screen title="Sessions">
    <Text>Sessions list</Text>
  </Screen>
);

function mockPanes(
  onInspectorStateChange: SetInspectorState,
  overflowing: boolean,
): MockPanes {
  return {
    sidebar: <View className="w-frame-rail" />,
    list: sessionsList,
    page: mockPage,
    inspector: () => mockInspector(onInspectorStateChange),
    band: mockBand(onInspectorStateChange, overflowing),
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
  overflowing: boolean,
): ScaffoldProps['band'] {
  return {
    title: <Text>Session</Text>,
    menu: <IconButton icon="more" accessibilityLabel="More" />,
    workbench: workbenchCards(onInspectorStateChange, overflowing),
    onInspectorToggle: () => onInspectorStateChange('open'),
  };
}

const workbenchCards = (
  open: SetInspectorState,
  overflowing: boolean,
): ReactElement =>
  overflowing ? (
    overflowCards(open)
  ) : (
    <Card title="Changes" onPress={() => open('open')}>
      <Text>2 files</Text>
    </Card>
  );

const overflowCards = (open: SetInspectorState): ReactElement => (
  <View className="gap-2">
    {Array.from({ length: 12 }, (_, index) => (
      <Card
        key={index}
        title={`Section ${index + 1}`}
        onPress={() => open('open')}
      >
        <Text>Section preview</Text>
      </Card>
    ))}
  </View>
);
