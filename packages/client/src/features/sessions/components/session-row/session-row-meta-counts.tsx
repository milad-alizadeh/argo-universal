import { Label } from '@repo/kit/primitives/content/label';
import { StatusDot } from '@repo/kit/primitives/status/status-dot';
import type * as React from 'react';
import { View } from 'react-native';
import type { SessionRowMetadataProps } from './session-row-metadata-props';
import { sidebarRows } from './session-row-sidebar';

interface RunningWorkCountProps {
  count: number;
  icon: 'agent' | 'terminal';
  label: string;
  testID: string;
}

function RunningStatus({
  testID,
}: Pick<RunningWorkCountProps, 'testID'>): React.ReactNode {
  return (
    <View testID={testID} className="absolute right-0 -top-0.75">
      <StatusDot tone="success" pulse size="sm" />
    </View>
  );
}

/*
 * Completed work leaves the row; each active count carries its own running dot. The dot ends inside the count's right
 * edge, as the row's meta line clips at its sides.
 */
function RunningWorkCount(props: RunningWorkCountProps): React.ReactNode {
  return props.count > 0 ? (
    <View
      accessibilityLabel={`${props.label}: ${props.count} running`}
      className="relative shrink-0 pr-2.75"
    >
      <Label
        icon={props.icon}
        text={String(props.count)}
        sidebar={sidebarRows}
      />
      <RunningStatus testID={props.testID} />
    </View>
  ) : null;
}

export function SubagentsCount(
  props: SessionRowMetadataProps,
): React.ReactNode {
  return (
    <RunningWorkCount
      count={props.session.subagents.running}
      icon="agent"
      label="Agents"
      testID="subagents-status"
    />
  );
}

export function ShellsCount(props: SessionRowMetadataProps): React.ReactNode {
  return (
    <RunningWorkCount
      count={props.session.shells.running}
      icon="terminal"
      label="Background Tasks"
      testID="shells-status"
    />
  );
}
