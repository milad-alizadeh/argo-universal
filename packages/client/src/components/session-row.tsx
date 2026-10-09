import type { SessionInfo } from '@repo/contracts';
import { memo, useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';
import { useResolveClassNames } from 'uniwind';
import { fullTurnDegrees } from '#lib/motion';
import { cn } from '#lib/utils';
import { Badge } from '#primitives/badge';
import { Button } from '#primitives/button';
import { Text, TextClassContext } from '#primitives/text';
import { Icon } from '../lib/icon';
import { IssueIndicator, type IssueIndicatorProps } from './issue-indicator';
import {
  PullRequestIndicator,
  type PullRequestIndicatorProps,
} from './pull-request-indicator';
import { StatusIndicator, statusLabels } from './status-indicator';

export interface SessionRowProps {
  session: SessionInfo;
  logo: string;
  selected?: boolean;
  subagentsFailed?: boolean;
  issue?: IssueIndicatorProps;
  pullRequest?: PullRequestIndicatorProps;
  onSelect: (sessionId: string) => void;
}

const logoTurnMilliseconds = 3000;

export const SessionRow = memo(function SessionRow({
  session,
  logo,
  selected = false,
  subagentsFailed = false,
  issue,
  pullRequest,
  onSelect,
}: SessionRowProps) {
  const { color } = useResolveClassNames('text-foreground');
  const plan = session.plan;
  const hasMetadata = Boolean(
    (plan && plan.total > 0) ||
    session.subagents.total > 0 ||
    session.archivedAt !== null ||
    issue ||
    pullRequest,
  );
  const logoRotation = useSharedValue(0);
  useEffect(() => {
    logoRotation.set(
      session.status === 'running'
        ? withRepeat(
            withTiming(fullTurnDegrees, {
              duration: logoTurnMilliseconds,
              easing: Easing.linear,
            }),
            -1,
          )
        : 0,
    );
    return (): void => cancelAnimation(logoRotation);
  }, [session.status, logoRotation]);
  const logoStyle = useAnimatedStyle(
    () => ({ transform: [{ rotate: `${logoRotation.get()}deg` }] }),
    [logoRotation],
  );
  const markSurface = selected
    ? 'border-sidebar-accent bg-sidebar-accent'
    : 'border-background bg-background wide:border-sidebar wide:bg-sidebar';

  return (
    <Button
      variant="ghost"
      accessibilityLabel={`${session.title}, ${statusLabels[session.status]}`}
      accessibilityState={{ selected }}
      aria-selected={selected}
      onPress={() => onSelect(session.sessionId)}
      className={cn(
        'h-auto sm:h-auto w-full items-start justify-start gap-2 rounded-md px-2.5 py-3 wide:py-2 bg-background wide:bg-sidebar dark:active:bg-accent web:dark:hover:bg-accent',
        selected && 'bg-sidebar-accent wide:bg-sidebar-accent',
      )}
    >
      <TextClassContext.Provider value={undefined}>
        <View className="relative h-6 shrink-0 items-center justify-center wide:h-5">
          <Animated.View className="size-icon-md" style={logoStyle}>
            <SvgXml
              testID="session-logo"
              xml={logo}
              width="100%"
              height="100%"
              color={color}
            />
          </Animated.View>
          <StatusIndicator
            testID="session-status"
            status={session.status}
            className={cn('absolute -right-1 -top-0.5', markSurface)}
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
          {hasMetadata && (
            <View className="min-h-5 flex-row flex-wrap items-center gap-x-3 gap-y-1 pt-1">
              {plan && plan.total > 0 && (
                <View
                  accessibilityLabel={`Plan: ${plan.done} of ${plan.total} complete`}
                  className="shrink-0 flex-row items-center gap-1.5"
                >
                  <View className="w-session-plan shrink-0 flex-row gap-0.5">
                    {Array.from({ length: plan.total }, (_, index) => ({
                      step: index + 1,
                      position: index,
                    })).map(({ step, position }) => (
                      <View
                        key={step}
                        className={cn(
                          'h-1 min-w-0 flex-1 rounded-full bg-foreground/15',
                          position < plan.done && 'bg-muted-foreground',
                          position === plan.done && 'bg-foreground',
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
                  <View className="relative">
                    <Icon name="agent" className="text-muted-foreground" />
                    {(subagentsFailed || session.subagents.running > 0) && (
                      <StatusIndicator
                        testID="subagents-status"
                        status={subagentsFailed ? 'failed' : 'running'}
                        size="small"
                        className={cn(
                          'absolute -right-0.75 -top-0.75',
                          markSurface,
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
              {issue && (
                <View
                  testID="session-issue-slot"
                  className="h-4 shrink-0 flex-row items-center"
                >
                  <IssueIndicator {...issue} />
                </View>
              )}
              {pullRequest && (
                <View
                  testID="session-pull-request-slot"
                  className="h-4 shrink-0 flex-row items-center"
                >
                  <PullRequestIndicator {...pullRequest} />
                </View>
              )}
            </View>
          )}
        </View>
      </TextClassContext.Provider>
    </Button>
  );
});
