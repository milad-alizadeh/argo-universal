import type { ToolCallUpdate } from '@repo/contracts';
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { TerminalWindowIcon } from 'phosphor-react-native/src/icons/TerminalWindow';
import { XIcon } from 'phosphor-react-native/src/icons/X';
import { View } from 'react-native';
import { cn } from '#lib/utils';
import { Text } from '#primitives/text';
import { toolCallTitle } from '../feed/tool-call-title';
import { useToolCallDuration } from '../feed/use-tool-call-duration';
import { FeedCodeBlock } from './FeedCodeBlock';
import { Icon } from './Icon';
import { ToolCallDisclosure } from './ToolCallDisclosure';

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
}: CommandRowProps) {
  const running = row.status === 'pending' || row.status === 'in_progress';
  const stopped = row.status === 'cancelled';
  const duration = useToolCallDuration(row, now);
  const terminal = row.content.find((content) => content.type === 'terminal');
  if (!terminal) return null;
  const exitCode = terminal.exitStatus?.exitCode;
  const failed =
    row.status === 'failed' || (exitCode !== undefined && exitCode !== 0);
  const failureStatus = exitCode !== undefined ? `exit ${exitCode}` : 'failed';
  let status = duration;
  let outcome = 'Completed';
  switch (row.status) {
    case 'pending':
    case 'in_progress':
      outcome = 'Running';
      break;
    case 'cancelled':
      outcome = 'Stopped';
      if (duration) status = `after ${duration}`;
      break;
    case 'failed':
      outcome = 'Failed';
      break;
    case 'completed':
      break;
  }
  if (exitCode !== undefined && !running) outcome = `Exit ${exitCode}`;
  if (failed) status = [failureStatus, duration].filter(Boolean).join(' · ');
  const output = terminal.output.replace(/\r\n/g, '\n').replace(/\n$/, '');
  return (
    <ToolCallDisclosure
      label={toolCallTitle(row, awaitingApproval)}
      icon={TerminalWindowIcon}
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
                as={failed ? XIcon : CheckIcon}
                className={cn('text-success', failed && 'text-destructive')}
              />
            )}
            <Text
              className={cn(
                'font-mono text-xs leading-5 text-muted-foreground',
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

function commandCode(command: string, output: string) {
  return output ? `$ ${command}\n${output}` : `$ ${command}`;
}
