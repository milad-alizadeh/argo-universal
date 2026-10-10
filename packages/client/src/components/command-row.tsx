import { isToolCallRunning, type ToolCallUpdate } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/utils';
import { Text } from '#primitives/text';
import { toolCallTitle, toolCallTitlePaths } from '../feed/tool-call-title';
import { useToolCallDuration } from '../feed/use-tool-call-duration';
import { Icon } from '../lib/icon';
import { FeedCodeBlock } from './feed-code-block';
import { ToolCallDisclosure } from './tool-call-disclosure';

export interface CommandRowProps {
  row: ToolCallUpdate;
  initialOpen?: boolean;
  now?: number;
  permissionMessage?: string;
  awaitingApproval?: boolean;
}

export function CommandRow({
  row,
  initialOpen,
  now,
  permissionMessage,
  awaitingApproval = false,
}: CommandRowProps): React.JSX.Element | null {
  const running = isToolCallRunning(row);
  const stopped = row.status === 'cancelled';
  const duration = useToolCallDuration(row, now);
  const terminal = row.content.find((content) => content.type === 'terminal');
  if (!terminal) return null;
  const exitCode = terminal.exitStatus?.exitCode;
  const failed =
    row.status === 'failed' || (exitCode !== undefined && exitCode !== 0);
  const failureStatus = exitCode === undefined ? 'failed' : `exit ${exitCode}`;
  let status = duration;
  let outcome = running ? 'Running' : 'Completed';
  if (stopped) {
    outcome = 'Stopped';
    if (duration) status = `after ${duration}`;
  } else if (row.status === 'failed') outcome = 'Failed';
  if (exitCode !== undefined && !running) outcome = `Exit ${exitCode}`;
  if (failed) status = [failureStatus, duration].filter(Boolean).join(' · ');
  const output = terminal.output.replace(/\r\n/g, '\n').replace(/\n$/, '');
  return (
    <ToolCallDisclosure
      label={toolCallTitle(row, awaitingApproval)}
      paths={toolCallTitlePaths(row, awaitingApproval)}
      icon="terminal"
      failed={failed}
      running={running}
      initialOpen={initialOpen}
      trailing={awaitingApproval ? undefined : status}
      awaitingApproval={awaitingApproval}
      permissionOutcome={row._meta?.argo?.permissionOutcome}
      permissionMessage={permissionMessage}
    >
      <FeedCodeBlock
        language="Shell"
        code={commandCode(terminal.command, output)}
        footer={
          <View className="flex-row items-center gap-1.5 px-3 pb-2">
            {!running && !stopped && (
              <Icon
                name={failed ? 'close' : 'check'}
                className={cn('text-success', failed && 'text-destructive')}
              />
            )}
            <Text
              className={cn(
                'type-code-block text-muted-foreground',
                failed && 'text-destructive',
              )}
            >
              {outcome}
            </Text>
          </View>
        }
      />
    </ToolCallDisclosure>
  );
}

function commandCode(command: string, output: string): string {
  return output ? `$ ${command}\n${output}` : `$ ${command}`;
}
