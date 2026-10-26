import { useState, type JSX } from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { SubagentFeed, useSessionPanels } from '#features/sessions';
import {
  sessionShells,
  runningShell,
  shellNow,
} from '../../../features/sessions/components/shell-list/shell-list.mocks';
import { longRunningOutput } from '../../../features/sessions/components/shell-list/shell-output.mocks';
import { runningFeed } from '../../../features/sessions/components/subagent-feed/subagent-feed.mocks';
import {
  runningSubagent,
  subagentNow,
} from '../../../features/sessions/components/subagent-list/subagent-list.mocks';
import { manyChanges, useMemoryChanges } from './session-changes.test.mocks';
import { SessionInspector } from './session-inspector';

// Long real entry shapes with distinct identities exercise each section's scroll independently.
const inspectorAgents = [
  runningSubagent,
  ...Array.from({ length: 30 }, (_, index) => ({
    ...runningSubagent,
    sessionId: `inspector-agent-${index}`,
    title: `Inspect module ${index}`,
  })),
];

const inspectorShells = [
  ...sessionShells,
  ...Array.from({ length: 30 }, (_, index) => ({
    ...runningShell,
    id: `inspector-shell-${index}`,
    command: `pnpm check-module-${index}`,
  })),
];

export function OverflowingInspector(): JSX.Element {
  const panels = useSessionPanels(['changes', 'shells', 'subagents']);
  const [opened, setOpened] = useState(false);
  const changes = useMemoryChanges(manyChanges);

  if (!opened) {
    panels.select('subagents');
    panels.select('shells');
    panels.select('changes');
    setOpened(true);
  }

  return (
    <View className="h-80 flex-row">
      <SessionInspector
        panels={panels}
        subagents={{ subagents: inspectorAgents, now: subagentNow }}
        renderSubagentFeed={(props) => (
          <SubagentFeed {...props} feed={runningFeed} now={subagentNow} />
        )}
        changes={changes}
        shells={{
          shells: inspectorShells,
          output: longRunningOutput,
          now: shellNow,
          onStop: fn(),
        }}
      />
    </View>
  );
}
