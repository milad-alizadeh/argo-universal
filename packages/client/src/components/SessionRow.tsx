import type { SessionInfo } from '@repo/contracts';
import { RobotIcon } from 'phosphor-react-native';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';
import { useResolveClassNames } from 'uniwind';
import { cn } from '#lib/utils';
import { Badge } from '#primitives/badge';
import { Button } from '#primitives/button';
import { Text } from '#primitives/text';
import { Icon } from './Icon';

export interface SessionRowProps {
  session: SessionInfo;
  logo: string;
  selected?: boolean;
  subagentsFailed?: boolean;
  issue?: { number: number };
  pullRequest?: {
    number: number;
    status: 'open' | 'draft' | 'merged' | 'conflict' | 'closed';
  };
  onSelect: (sessionId: string) => void;
}

const statusAppearance = {
  needs_input: { label: 'Needs input', className: 'bg-warning' },
  running: { label: 'Running', className: 'bg-success' },
  failed: { label: 'Failed', className: 'bg-destructive' },
  unread: { label: 'Unread', className: 'bg-info' },
  idle: { label: 'Idle', className: 'bg-muted-foreground' },
} satisfies Record<SessionInfo['status'], { label: string; className: string }>;

export function SessionRow({
  session,
  logo,
  selected = false,
  subagentsFailed = false,
  issue,
  pullRequest,
  onSelect,
}: SessionRowProps) {
  const { color } = useResolveClassNames('text-foreground');
  const status = statusAppearance[session.status];
  const plan = session.plan;
  const logoOpacity = useSharedValue(1);
  useEffect(() => {
    logoOpacity.value =
      session.status === 'running'
        ? withRepeat(withTiming(0.6, { duration: 1000 }), -1, true)
        : 1;
    return () => cancelAnimation(logoOpacity);
  }, [session.status, logoOpacity]);
  const logoStyle = useAnimatedStyle(
    () => ({ opacity: logoOpacity.value }),
    [logoOpacity],
  );
  const markBorder = selected
    ? 'border-sidebar-accent'
    : 'border-background wide:border-sidebar';

  return (
    <Button
      variant="ghost"
      accessibilityLabel={`${session.title}, ${status.label}`}
      accessibilityState={{ selected }}
      aria-selected={selected}
      onPress={() => onSelect(session.sessionId)}
      className={cn(
        'h-auto sm:h-auto w-full items-start justify-start gap-2 rounded-md px-2.5 py-3 wide:py-2',
        selected && 'bg-sidebar-accent',
      )}
    >
      <View className="relative h-6 w-4 shrink-0 items-center justify-center wide:h-5">
        <Animated.View className="w-full" style={logoStyle}>
          <SvgXml
            testID="session-logo"
            xml={logo}
            width="100%"
            height="16"
            color={color}
          />
        </Animated.View>
        <View
          testID="session-status"
          className={cn(
            'absolute -right-1 -top-0.5 size-2.5 rounded-full border-2',
            status.className,
            markBorder,
          )}
        />
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text
          numberOfLines={1}
          className="text-base font-medium leading-6 wide:text-sm wide:leading-5"
        >
          {session.title}
        </Text>
        <Text
          numberOfLines={1}
          className="text-sm font-normal leading-5 text-muted-foreground wide:text-xs wide:leading-4"
        >
          {session.activity}
        </Text>
        <View className="min-h-5 flex-row flex-wrap items-center gap-x-3 gap-y-1 pt-1">
          {plan && plan.total > 0 && (
            <View
              accessibilityLabel={`Plan: ${plan.done} of ${plan.total} complete`}
              className="shrink-0 flex-row items-center gap-1.5"
            >
              <View className="w-session-plan flex-row gap-0.5">
                {Array.from({ length: plan.total }, (_, index) => (
                  <View
                    key={index}
                    className={cn(
                      'h-1 min-w-0 flex-1 rounded-full bg-foreground/15',
                      index < plan.done && 'bg-muted-foreground',
                      index === plan.done && 'bg-foreground',
                    )}
                  />
                ))}
              </View>
              <Text className="text-xs font-normal leading-4 text-muted-foreground">
                {plan.done}/{plan.total}
              </Text>
            </View>
          )}
          {session.subagents.total > 0 && (
            <View
              accessibilityLabel={`Subagents: ${session.subagents.total}, ${session.subagents.running} running`}
              className="shrink-0 flex-row items-center gap-1"
            >
              <View className="relative size-3.5">
                <Icon
                  as={RobotIcon}
                  className="size-3.5 text-muted-foreground"
                />
                {(subagentsFailed || session.subagents.running > 0) && (
                  <View
                    testID="subagents-running"
                    className={cn(
                      'absolute -right-0.75 -top-0.75 size-2 rounded-full border-2',
                      subagentsFailed ? 'bg-destructive' : 'bg-success',
                      markBorder,
                    )}
                  />
                )}
              </View>
              <Text className="text-xs font-normal leading-4 text-muted-foreground">
                {session.subagents.total}
              </Text>
            </View>
          )}
          {session.archivedAt !== null && (
            <Badge variant="secondary" className="py-0">
              <Text className="text-xs font-normal leading-4 text-muted-foreground">
                Archived
              </Text>
            </Badge>
          )}
          <View
            testID="session-issue-slot"
            className="h-4 w-session-issue shrink-0 flex-row items-center gap-1"
          >
            {issue && (
              <SessionMetadata
                number={issue.number}
                label="Issue"
                icon={issueIcon}
                className="text-muted-foreground"
              />
            )}
          </View>
          <View
            testID="session-pull-request-slot"
            className="h-4 w-session-pull-request shrink-0 flex-row items-center gap-1"
          >
            {pullRequest && (
              <SessionMetadata
                number={pullRequest.number}
                label={`${pullRequest.status} PR`}
                icon={pullRequestAppearance[pullRequest.status].icon}
                className={pullRequestAppearance[pullRequest.status].className}
              />
            )}
          </View>
        </View>
      </View>
    </Button>
  );
}

const issueIcon =
  '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2M13 17v2M13 11v2"/>';
const pullRequestAppearance = {
  open: {
    className: 'text-success',
    icon: '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7M6 9v12"/>',
  },
  draft: {
    className: 'text-muted-foreground',
    icon: '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M18 6V5M18 11v-1M6 9v12"/>',
  },
  merged: {
    className: 'text-merged',
    icon: '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/>',
  },
  conflict: {
    className: 'text-warning',
    icon: '<path d="m4 4 4 4m0-4-4 4M6 11v4M12 6h4a2 2 0 0 1 2 2v7"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/>',
  },
  closed: {
    className: 'text-destructive',
    icon: '<circle cx="6" cy="6" r="3"/><path d="M6 9v12m15-18-6 6m6 0-6-6M18 11.5V15"/><circle cx="18" cy="18" r="3"/>',
  },
};

function SessionMetadata({
  number,
  label,
  icon,
  className,
}: {
  number: number;
  label: string;
  icon: string;
  className: string;
}) {
  const { color } = useResolveClassNames(className);
  return (
    <View
      accessibilityLabel={`${label} #${number}`}
      className="flex-row items-center gap-1"
    >
      <SvgXml
        xml={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>`}
        width={14}
        height={14}
        color={color}
      />
      <Text className={cn('text-xs font-normal leading-4', className)}>
        #{number}
      </Text>
    </View>
  );
}
