import type {
  ToolCallContent,
  ToolCallTerminal,
  ToolCallUpdate,
} from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { FeedCodeBlock } from '#lib/product/markdown/feed-code-block/feed-code-block';
import { Icon } from '#primitives/display/icon/icon';
import { Text } from '#primitives/display/text/text';
import { useToolCallDuration } from '../../hooks/use-tool-call-duration';
import {
  ToolCallDisclosure,
  toolCallDisclosureProps,
} from '../tool-call-disclosure';
import { ToolOutput } from '../tool-output';
import {
  type CommandFooterState,
  type CommandState,
  commandCode,
  commandState,
} from './command-state';

export interface CommandRowProps {
  row: ToolCallUpdate;
  initialOpen?: boolean;
  now?: number;
  permissionMessage?: string;
  awaitingApproval?: boolean;
}

type CommandDisclosureProps = CommandRowProps & {
  terminal: ToolCallTerminal;
  duration: string | undefined;
};

const destructiveClassName = 'text-destructive';

const nonTerminalContent = (row: ToolCallUpdate): ToolCallContent[] =>
  row.content.filter((block) => block.type !== 'terminal');

function OutcomeIcon({ failed }: { failed: boolean }): React.JSX.Element {
  return (
    <Icon
      name={failed ? 'close' : 'check'}
      role="secondary"
      className={cn('text-success', failed && destructiveClassName)}
    />
  );
}

function OutcomeText({
  failed,
  outcome,
}: CommandFooterState): React.JSX.Element {
  return (
    <Text
      role="code"
      className={cn('text-muted-foreground', failed && destructiveClassName)}
    >
      {outcome}
    </Text>
  );
}

function CommandFooter(props: CommandFooterState): React.JSX.Element {
  return (
    <View className="flex-row items-center gap-1.5 px-3 pb-2">
      {props.settled && <OutcomeIcon failed={props.failed} />}
      <OutcomeText {...props} />
    </View>
  );
}

function CommandOutput(
  props: CommandDisclosureProps & { state: CommandState },
): React.JSX.Element {
  return (
    <>
      <FeedCodeBlock
        language="Shell"
        code={commandCode(props.terminal)}
        footer={<CommandFooter {...props.state.footer} />}
      />
      <ToolOutput content={nonTerminalContent(props.row)} />
    </>
  );
}

function CommandDisclosure(props: CommandDisclosureProps): React.JSX.Element {
  const state = commandState(props);

  return (
    <ToolCallDisclosure
      {...toolCallDisclosureProps(props.row, props.awaitingApproval)}
      {...state.disclosure}
      icon="terminal"
      initialOpen={props.initialOpen}
      permissionMessage={props.permissionMessage}
    >
      <CommandOutput {...props} state={state} />
    </ToolCallDisclosure>
  );
}

export function CommandRow(props: CommandRowProps): React.JSX.Element | null {
  const duration = useToolCallDuration(props.row, props.now);

  const terminal = props.row.content.find(
    (content) => content.type === 'terminal',
  );

  return terminal ? (
    <CommandDisclosure {...props} terminal={terminal} duration={duration} />
  ) : null;
}
