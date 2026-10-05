import type { SessionInfo } from '@repo/contracts';
import { RobotIcon } from 'phosphor-react-native';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useResolveClassNames } from 'uniwind';
import { cn } from '#lib/utils';
import { Button } from '#primitives/button';
import { Text } from '#primitives/text';
import { Icon } from './Icon';

export interface SessionRowProps {
  session: SessionInfo;
  logo: string;
  selected?: boolean;
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
  onSelect,
}: SessionRowProps) {
  const { color } = useResolveClassNames('text-foreground');
  const status = statusAppearance[session.status];
  const plan = session.plan;
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
        'h-auto w-full items-start justify-start gap-2 rounded-md px-2.5 py-3 wide:py-2',
        selected && 'bg-sidebar-accent',
      )}
    >
      <View className="relative h-6 w-4 shrink-0 items-center justify-center wide:h-5">
        <SvgXml xml={logo} width="100%" height="16" color={color} />
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
                {session.subagents.running > 0 && (
                  <View
                    testID="subagents-running"
                    className={cn(
                      'absolute -right-0.5 -top-0.5 size-2 rounded-full border-2 bg-success',
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
          <View
            testID="session-issue-slot"
            className="h-4 w-session-issue shrink-0"
          />
          <View
            testID="session-pull-request-slot"
            className="h-4 w-session-pull-request shrink-0"
          />
        </View>
      </View>
    </Button>
  );
}
