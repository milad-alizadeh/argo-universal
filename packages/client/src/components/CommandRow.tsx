import type { ToolCallUpdate } from '@repo/contracts';
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { TerminalWindowIcon } from 'phosphor-react-native/src/icons/TerminalWindow';
import { XIcon } from 'phosphor-react-native/src/icons/X';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { cn } from '#lib/utils';
import { Text } from '#primitives/text';
import { FeedDisclosure } from './FeedDisclosure';
import { Icon } from './Icon';

export interface CommandRowProps {
  row: ToolCallUpdate;
  initialOpen?: boolean;
  now?: number;
}

export function CommandRow({ row, initialOpen, now }: CommandRowProps) {
  const running = row.status === 'pending' || row.status === 'in_progress';
  const [clock, setClock] = useState(Date.now);
  useEffect(() => {
    if (!running || now !== undefined) return;
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running, now]);
  const terminal = row.content.find((content) => content.type === 'terminal');
  const timing = row._meta?.argo;
  const end = running ? (now ?? clock) : timing?.endedAt;
  const duration =
    timing?.startedAt !== undefined && end !== undefined
      ? `${Number((Math.max(0, end - timing.startedAt) / 1000).toFixed(1))}s`
      : undefined;
  if (!terminal) return null;
  const exitCode = terminal.exitStatus?.exitCode;
  const failed =
    row.status === 'failed' || (exitCode !== undefined && exitCode !== 0);
  const failureStatus = exitCode !== undefined ? `exit ${exitCode}` : 'failed';
  const status = failed
    ? [failureStatus, duration].filter(Boolean).join(' · ')
    : duration;
  let outcome = 'Completed';
  if (terminal.exitStatus?.exitCode !== undefined)
    outcome = `Exit ${terminal.exitStatus.exitCode}`;
  if (running) outcome = 'Running';
  const outputLines = terminal.output
    .replace(/\r\n/g, '\n')
    .replace(/\n$/, '')
    .split('\n');
  const hiddenLines = Math.max(0, outputLines.length - 3);
  return (
    <FeedDisclosure
      label={`${running ? 'Running' : 'Ran'} ${terminal.command}`}
      description={row.title}
      icon={TerminalWindowIcon}
      failed={failed}
      running={running}
      initialOpen={initialOpen}
      trailing={
        status && (
          <Text
            className={cn(
              'shrink-0 text-sm leading-5 text-muted-foreground',
              failed && 'text-destructive',
            )}
          >
            {status}
          </Text>
        )
      }
      preview={
        Boolean(terminal.output) && (
          <View className="overflow-hidden rounded-xl border border-border bg-sidebar">
            <ScrollView
              horizontal
              className="w-full"
              contentContainerClassName="px-3 py-2"
            >
              <Text className="font-mono text-xs leading-5 text-foreground">
                {outputLines.slice(-3).join('\n')}
              </Text>
            </ScrollView>
            {hiddenLines > 0 && (
              <Text className="border-t border-border px-3 py-0.5 text-sm leading-5 text-muted-foreground">{`+${hiddenLines} lines`}</Text>
            )}
          </View>
        )
      }
    >
      <View className="overflow-hidden rounded-xl border border-border bg-sidebar">
        <Text className="border-b border-border px-3 py-2 font-mono text-xs leading-5 text-foreground">{`$ ${terminal.command}`}</Text>
        <ScrollView
          horizontal
          className="w-full"
          contentContainerClassName="px-3 py-2"
        >
          <Text className="font-mono text-xs leading-5 text-foreground">
            {terminal.output}
          </Text>
        </ScrollView>
        <View className="flex-row items-center gap-1.5 px-3 pb-2">
          {!running && (
            <Icon
              as={failed ? XIcon : CheckIcon}
              className={cn(
                'size-3.5 text-success',
                failed && 'text-destructive',
              )}
            />
          )}
          <Text
            className={cn(
              'text-sm leading-5 text-muted-foreground',
              failed && 'text-destructive',
            )}
          >
            {outcome}
          </Text>
        </View>
      </View>
    </FeedDisclosure>
  );
}
