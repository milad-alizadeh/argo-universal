import type { SessionInfo } from '@repo/contracts';
import { RobotIcon } from 'phosphor-react-native';
import { useEffect } from 'react';
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
import { cn } from '#lib/utils';
import { Badge } from '#primitives/badge';
import { Button } from '#primitives/button';
import { Text, TextClassContext } from '#primitives/text';
import { Icon } from './Icon';
import { IssueIndicator, type IssueIndicatorProps } from './IssueIndicator';
import {
  PullRequestIndicator,
  type PullRequestIndicatorProps,
} from './PullRequestIndicator';
import { StatusIndicator, statusLabels } from './StatusIndicator';

export interface SessionRowProps {
  session: SessionInfo;
  logo: string;
  selected?: boolean;
  subagentsFailed?: boolean;
  issue?: IssueIndicatorProps;
  pullRequest?: PullRequestIndicatorProps;
  onSelect: (sessionId: string) => void;
}

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
    logoRotation.value =
      session.status === 'running'
        ? withRepeat(
            withTiming(360, { duration: 3000, easing: Easing.linear }),
            -1,
          )
        : 0;
    return () => cancelAnimation(logoRotation);
  }, [session.status, logoRotation]);
  const logoStyle = useAnimatedStyle(
    () => ({ transform: [{ rotate: `${logoRotation.value}deg` }] }),
    [logoRotation],
  );
  const markBorder = selected
    ? 'border-sidebar-accent'
    : 'border-background wide:border-sidebar';

  return (
    <Button
      variant="ghost"
      accessibilityLabel={`${session.title}, ${statusLabels[session.status]}`}
      accessibilityState={{ selected }}
      aria-selected={selected}
      onPress={() => onSelect(session.sessionId)}
      className={cn(
        'h-auto sm:h-auto w-full items-start justify-start gap-2 rounded-md px-2.5 py-3 wide:py-2',
        selected && 'bg-sidebar-accent',
      )}
    >
      <TextClassContext.Provider value={undefined}>
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
          <StatusIndicator
            testID="session-status"
            status={session.status}
            className={cn('absolute -right-1 -top-0.5', markBorder)}
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
                      <StatusIndicator
                        testID="subagents-status"
                        status={subagentsFailed ? 'failed' : 'running'}
                        size="small"
                        className={cn(
                          'absolute -right-0.75 -top-0.75',
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
}
