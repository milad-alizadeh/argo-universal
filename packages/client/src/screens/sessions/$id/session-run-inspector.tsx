import type { RunConfigurationRow } from '@repo/contracts';
import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import { Icon } from '@repo/kit/primitives/content/icon';
import { Link } from '@repo/kit/primitives/content/link';
import { Text } from '@repo/kit/primitives/content/text';
import { StatusDot } from '@repo/kit/primitives/status/status-dot';
import { useClock } from '@repo/kit/use-clock';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import {
  runIsActive,
  runStatusLabel,
  runStatusTone,
} from '../../../features/sessions/components/run-status';
import type { SessionRuns } from './sections/runs-section';

type Props = { run: RunConfigurationRow; controls: SessionRuns };

function RunHeader({ run, controls }: Props): ReactElement {
  const { name, status } = run;
  const active = runIsActive(run);
  const now = useClock(active, controls.now);

  return (
    <View className="min-w-0 flex-row items-center gap-2">
      <Icon name="terminal" tone="muted" />
      <Text numberOfLines={1} className="min-w-0 shrink">
        {name}
      </Text>
      <StatusDot tone={runStatusTone[status]} size="sm" />
      <Text
        role="secondary"
        tone="muted"
        numberOfLines={1}
        className="min-w-0 flex-1"
      >
        {runStatusLabel(run, now, true)}
      </Text>
      <IconButton
        icon="retry"
        variant="ghost"
        size="sm"
        accessibilityLabel={`Restart ${name}`}
        onPress={() => controls.onRestart(name)}
      />
      <IconButton
        icon="stop"
        variant="ghost"
        size="sm"
        danger
        disabled={!active}
        accessibilityLabel={`Stop ${name}`}
        onPress={() => controls.onStop(name)}
      />
    </View>
  );
}

function RunAddress({ url }: { url: string }): ReactElement {
  return (
    <View className="min-w-0 flex-row items-center gap-2 rounded-control bg-muted px-2 py-1">
      <Icon name="external-link" tone="muted" />
      <Text
        role="secondary-code"
        tone="muted"
        numberOfLines={1}
        className="min-w-0 flex-1"
      >
        <Link href={url} label={url} />
      </Text>
    </View>
  );
}

export function RunInspector({ run, controls }: Props): ReactElement {
  return (
    <View className="min-h-0 flex-1 gap-2">
      <RunHeader run={run} controls={controls} />
      {run.url && <RunAddress url={run.url} />}
      {controls.renderTerminal(run)}
    </View>
  );
}
