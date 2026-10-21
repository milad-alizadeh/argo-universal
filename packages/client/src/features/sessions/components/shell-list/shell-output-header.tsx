import { Button } from '@repo/kit/primitives/actions/button';
import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import { Icon } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import { StatusDot } from '@repo/kit/primitives/status/status-dot';
import type { JSX } from 'react';
import { View } from 'react-native';
import { shellHeading } from './shell-format';
import type { ShellEntry } from './shell-list-types';

export interface ShellOutputHeaderProps {
  shell: ShellEntry;
  onBack: () => void;
  onStop: (shell: ShellEntry) => void;
  now: number;
}

// Stop ends a run, so it reads as danger does everywhere: red text, no fill and no border.
const stopAppearance = {
  variant: 'ghost',
  tone: 'danger',
  size: 'xs',
  label: 'Stop',
} as const;

// A running Shell the Server can still reach offers Stop; an ended one offers nothing.
function StopButton({
  shell,
  onStop,
}: Pick<ShellOutputHeaderProps, 'shell' | 'onStop'>): JSX.Element | null {
  if (shell.status !== 'running' || !shell.canStop) return null;

  return (
    <Button
      {...stopAppearance}
      accessibilityLabel={`Stop ${shell.command}`}
      onPress={() => onStop(shell)}
    />
  );
}

// How the Shell stands, filling the gap between its command and Stop.
function Heading({
  shell,
  now,
}: Pick<ShellOutputHeaderProps, 'shell' | 'now'>): JSX.Element {
  const heading = shellHeading(shell, now);

  return (
    <View className="min-w-0 flex-1 flex-row items-center gap-1.5">
      {heading.running && <StatusDot tone="success" size="sm" />}
      <Text role="secondary" tone={heading.tone} numberOfLines={1}>
        {heading.label}
      </Text>
    </View>
  );
}

// A long command truncates rather than pushing Stop out of the row, which it would do natively without this.
function Command({ command }: { command: string }): JSX.Element {
  return (
    <View className="min-w-0 shrink">
      <Text role="secondary-code" numberOfLines={1}>
        {command}
      </Text>
    </View>
  );
}

const backAppearance = {
  variant: 'ghost',
  size: 'xs',
  corners: 'tight',
  iconRole: 'chevron',
  icon: 'chevron-left',
  accessibilityLabel: 'Back to Shells',
} as const;

// The wide panel's own header over a Shell's output: back to the list, the command, how it stands, and Stop.
export function ShellOutputHeader(props: ShellOutputHeaderProps): JSX.Element {
  return (
    <View className="h-11 shrink-0 flex-row items-center gap-1.5 pr-2 pl-1.5">
      <IconButton {...backAppearance} onPress={props.onBack} />
      <Icon name="terminal" role="body" />
      <Command command={props.shell.command} />
      <Heading shell={props.shell} now={props.now} />
      <StopButton shell={props.shell} onStop={props.onStop} />
    </View>
  );
}
