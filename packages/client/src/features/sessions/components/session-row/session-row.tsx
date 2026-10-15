import type { SessionInfo } from '@repo/contracts';
import { memo } from 'react';
import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import {
  StatusIndicator,
  statusLabels,
} from '#lib/product/status-indicator/status-indicator';
import { contentActionClass } from '#primitives/buttons/button';
import { Text, TextClassContext } from '#primitives/display/text';
import { Pressable } from '#primitives/pressable';
import type { IssueIndicatorProps } from '../issue-indicator/issue-indicator';
import type { PullRequestIndicatorProps } from '../pull-request-indicator/pull-request-indicator';
import { SessionLogo } from './session-row-logo';
import {
  markSurface,
  SessionRowMetadata,
  type SessionRowMetadataProps,
} from './session-row-metadata';

export interface SessionRowProps {
  session: SessionInfo;
  logo: string;
  selected?: boolean;
  subagentsFailed?: boolean;
  issue?: IssueIndicatorProps;
  pullRequest?: PullRequestIndicatorProps;
  // Short text at the end of the title line, such as how long ago a search result was active.
  trailing?: string;
  onSelect: (sessionId: string) => void;
}

function sessionRowClass(selected: boolean): string {
  return contentActionClass({
    variant: 'ghost',
    className: cn(
      'h-auto sm:h-auto w-full items-start justify-start gap-2 rounded-md px-2.5 py-3 wide:gap-3 wide:px-4 wide:py-2 wide:rounded-xl bg-content wide:bg-transparent dark:active:bg-muted web:dark:hover:bg-muted',
      selected && 'bg-muted wide:bg-selected',
    ),
  });
}

function sessionRowPressProps(
  { session, onSelect }: SessionRowProps,
  selected: boolean,
): React.ComponentProps<typeof Pressable> & { 'aria-pressed': boolean } {
  return {
    accessibilityLabel: `${session.title}, ${statusLabels[session.status]}`,
    accessibilityState: { selected },
    'aria-pressed': selected,
    onPress: () => onSelect(session.sessionId),
    role: 'button',
    className: sessionRowClass(selected),
  };
}

interface SessionMarkProps {
  status: SessionInfo['status'];
  logo: string;
  selected: boolean;
}

function SessionMark(props: SessionMarkProps): React.JSX.Element {
  return (
    <View className="relative h-6 shrink-0 items-center justify-center wide:size-5">
      <SessionLogo logo={props.logo} status={props.status} />
      <StatusIndicator
        testID="session-status"
        status={props.status}
        className={cn(
          'absolute -right-1 -top-0.5',
          markSurface(props.selected),
        )}
      />
    </View>
  );
}

function SessionRowTrailing({ text }: { text?: string }): React.ReactNode {
  if (text === undefined) return null;

  return (
    <View className="shrink-0">
      <Text role="secondary">{text}</Text>
    </View>
  );
}

// The title, and any trailing text at the line's end.
function SessionRowTitle(props: {
  title: string;
  trailing?: string;
}): React.JSX.Element {
  return (
    <View className="flex-row items-center gap-2">
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} role="body">
          {props.title}
        </Text>
      </View>
      <SessionRowTrailing text={props.trailing} />
    </View>
  );
}

function SessionRowContent(
  props: SessionRowMetadataProps & Pick<SessionRowProps, 'trailing'>,
): React.JSX.Element {
  return (
    <View className="min-w-0 flex-1 gap-0.5">
      <SessionRowTitle title={props.session.title} trailing={props.trailing} />
      <Text numberOfLines={1} role="secondary">
        {props.session.activity}
      </Text>
      <SessionRowMetadata {...props} />
    </View>
  );
}

export const SessionRow = memo(function SessionRow(props: SessionRowProps) {
  const { session, logo, selected = false } = props;

  return (
    <Pressable {...sessionRowPressProps(props, selected)}>
      <TextClassContext.Provider value={undefined}>
        <SessionMark status={session.status} logo={logo} selected={selected} />
        <SessionRowContent {...props} selected={selected} />
      </TextClassContext.Provider>
    </Pressable>
  );
});
