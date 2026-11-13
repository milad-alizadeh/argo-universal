import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import { type ReactElement, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Scaffold, type ScaffoldProps } from './scaffold';
import {
  mockPage,
  mockPanes,
  type SetInspectorState,
  useMockState,
} from './scaffold-workbench.mocks';

const firstSessionId = 'first-session';

const secondSessionId = 'second-session';

interface MockSessionSwitch {
  sessionId: string;
  onSwitch: () => void;
}

// The second Session's page closes the Inspector a render after it shows, as a page claims its Inspector once it mounts.
function useMockSessionSwitch(
  onInspectorStateChange: SetInspectorState,
): MockSessionSwitch {
  const [sessionId, setSessionId] = useState(firstSessionId);

  useEffect(() => {
    if (sessionId === secondSessionId) onInspectorStateChange('closed');
  }, [sessionId, onInspectorStateChange]);

  return { sessionId, onSwitch: () => setSessionId(secondSessionId) };
}

const withSessionId = (
  band: ScaffoldProps['band'],
  sessionId: string,
): ScaffoldProps['band'] =>
  band?.session ? { ...band, session: { ...band.session, sessionId } } : band;

const switchingPage = (onSwitch: () => void): ReactElement => (
  <View className="flex-1">
    <IconButton
      icon="chevron-right"
      accessibilityLabel="Open another Session"
      onPress={onSwitch}
    />
    {mockPage}
  </View>
);

// A Session page with the Inspector open, and a button that opens another Session in its place.
export function SessionSwitchScaffold(): ReactElement {
  const state = useMockState(true);
  const session = useMockSessionSwitch(state.onInspectorStateChange);
  const panes = mockPanes(state.onInspectorStateChange, false);

  return (
    <Scaffold
      {...panes}
      page={switchingPage(session.onSwitch)}
      band={withSessionId(panes.band, session.sessionId)}
      sizeClass="wide"
      {...state}
    />
  );
}
