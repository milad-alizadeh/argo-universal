import type { ContextUsage, PlanEntry } from '@repo/contracts';
import {
  ArrowsInLineVerticalIcon,
  CaretUpIcon,
  CheckIcon,
  ClockCountdownIcon,
  ListChecksIcon,
  RobotIcon,
  TerminalIcon,
} from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { withUniwind } from 'uniwind';
import { fullTurnDegrees } from '#lib/motion';
import { cn } from '#lib/utils';
import { Button } from '#primitives/button';
import { Text } from '#primitives/text';
import { useWide } from '../navigation/use-wide';
import { ComposerPopover } from './ComposerPopover';
import { useContentWide } from './ContentLayout';
import { Icon, IconSpinner } from './Icon';

const fullPercent = 100;
// Context use below this percent is the Smart zone; at or above, the Dumb zone.
const smartZonePercent = 20;
const contextRingRadius = 5.5;
const maximumPlanStepsHeight = 264;
const spinnerTurnMilliseconds = 750;

export interface ComposerStatusProps {
  plan?: PlanEntry[];
  subagents?: { count: number; running: boolean; onPress: () => void };
  shells?: { count: number; running: boolean; onPress: () => void };
  usage?: {
    limits: { label: string; usedPercent: number; resets: string }[];
  };
  context?: ContextUsage & { onCompact: () => void };
}

function Meter({
  percent,
  warning = false,
  className,
}: {
  percent: number;
  warning?: boolean;
  className?: string;
}) {
  return (
    <View
      role="progressbar"
      accessibilityValue={{ min: 0, max: fullPercent, now: percent }}
      className={cn('h-1.5 rounded-full bg-muted overflow-hidden', className)}
    >
      <View
        className={cn(
          'h-full rounded-full bg-foreground',
          warning && (percent < smartZonePercent ? 'bg-success' : 'bg-warning'),
        )}
        style={{ width: `${Math.max(0, Math.min(fullPercent, percent))}%` }}
      />
      {warning && (
        <View
          className="absolute top-0 bottom-0 w-0.5 bg-background"
          style={{ left: `${smartZonePercent}%` }}
        />
      )}
    </View>
  );
}
const ThemedCircle = withUniwind(Circle, {
  stroke: {
    fromClassName: 'strokeClassName',
    styleProperty: 'backgroundColor',
  },
});

function ContextRing({ percent }: { percent: number }) {
  const circumference = 2 * Math.PI * contextRingRadius;
  return (
    <View className="size-icon-md shrink-0 items-center justify-center">
      <View className="size-icon-mark">
        <Svg width="100%" height="100%" viewBox="0 0 14 14">
          <ThemedCircle
            cx={7}
            cy={7}
            r={contextRingRadius}
            fill="none"
            strokeClassName="bg-border"
            strokeWidth={2}
          />
          <ThemedCircle
            cx={7}
            cy={7}
            r={contextRingRadius}
            fill="none"
            strokeClassName={
              percent < smartZonePercent ? 'bg-success' : 'bg-warning'
            }
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray={`${(circumference * Math.max(0, Math.min(fullPercent, fullPercent - percent))) / fullPercent} ${circumference}`}
            transform="rotate(-90 7 7)"
          />
        </Svg>
      </View>
    </View>
  );
}

const compactNumber = (value: number) =>
  new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 0 })
    .format(value)
    .toLowerCase();

export function ComposerPlan({
  entries,
  disabled,
}: {
  entries: PlanEntry[];
  disabled: boolean;
}) {
  const done = entries.filter((entry) => entry.status === 'completed').length;
  const wide = useContentWide();
  const [expanded, setExpanded] = useState(false);
  const [stepsHeight, setStepsHeight] = useState(0);
  const revealHeight = useSharedValue(0);
  useEffect(() => {
    revealHeight.value = withTiming(expanded ? stepsHeight : 0, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });
    return () => cancelAnimation(revealHeight);
  }, [expanded, stepsHeight, revealHeight]);
  const revealStyle = useAnimatedStyle(
    () => ({
      height: revealHeight.value,
      opacity: revealHeight.value === 0 ? 0 : 1,
    }),
    [revealHeight],
  );
  const trigger = (
    <Button
      variant="ghost"
      disabled={disabled}
      accessibilityLabel="Plan"
      accessibilityState={{ expanded: wide ? expanded : undefined }}
      aria-expanded={wide ? expanded : undefined}
      onPress={wide ? () => setExpanded(!expanded) : undefined}
      className={cn(
        'h-6 sm:h-6 py-0 px-2.5 gap-1.5 rounded-full border border-border bg-card',
        wide
          ? 'h-8 sm:h-8 py-0 w-full pl-2 pr-1.5 rounded-none border-0 bg-transparent shadow-none justify-start'
          : 'shadow-composer',
      )}
    >
      <View className="flex-row gap-0.5">
        {entries.map((entry, index) => (
          <View
            key={`${index}:${entry.content}`}
            className={cn(
              'h-1 rounded-xs bg-border',
              wide ? 'w-3.5' : 'w-1.5',
              entry.status === 'completed' && 'bg-foreground',
            )}
          />
        ))}
      </View>
      <Text
        selectable={false}
        className={cn(
          'select-none text-xs leading-4 font-normal',
          wide && 'text-muted-foreground',
        )}
      >
        {wide ? `Plan ${done}/${entries.length}` : 'Plan'}
      </Text>
      {wide && (
        <>
          <Text
            selectable={false}
            numberOfLines={1}
            className="select-none flex-1 min-w-0 text-xs leading-4 font-normal text-foreground"
          >
            {entries.find((entry) => entry.status === 'in_progress')?.content}
          </Text>
          <Icon
            size="sm"
            as={CaretUpIcon}
            className={cn(
              'text-muted-foreground web:transition-transform web:duration-200',
              !expanded && 'rotate-180',
            )}
          />
        </>
      )}
    </Button>
  );
  if (wide)
    return (
      <View>
        {trigger}
        <Animated.View
          testID="composer-plan-steps"
          aria-hidden={!expanded}
          accessibilityElementsHidden={!expanded}
          pointerEvents={expanded ? 'auto' : 'none'}
          style={revealStyle}
          className="overflow-hidden"
        >
          <View
            className="absolute top-0 left-0 right-0"
            onLayout={(event) =>
              setStepsHeight(
                Math.min(
                  maximumPlanStepsHeight,
                  event.nativeEvent.layout.height,
                ),
              )
            }
          >
            <PlanSteps entries={entries} />
          </View>
        </Animated.View>
      </View>
    );
  return (
    <ComposerPopover label="Plan" width={420} trigger={trigger}>
      {() => (
        <View>
          <View className="px-4 py-3 gap-1.5">
            <View className="flex-row items-center gap-2">
              <Icon as={ListChecksIcon} className="text-foreground" />
              <Text
                selectable={false}
                className="select-none text-sm leading-5 font-medium"
              >
                Plan
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="w-16">
                <Meter
                  percent={(done / entries.length) * fullPercent}
                  className="h-1"
                />
              </View>
              <Text
                selectable={false}
                className="select-none text-xs leading-4 text-muted-foreground"
              >
                {done} of {entries.length} done
              </Text>
            </View>
          </View>
          <PlanSteps entries={entries} />
        </View>
      )}
    </ComposerPopover>
  );
}

function NativePlanSpinner({ label }: { label: string }) {
  const rotation = useSharedValue(0);
  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(fullTurnDegrees, {
        duration: spinnerTurnMilliseconds,
        easing: Easing.linear,
      }),
      -1,
    );
    return () => cancelAnimation(rotation);
  }, [rotation]);
  const style = useAnimatedStyle(
    () => ({ transform: [{ rotate: `${rotation.value}deg` }] }),
    [rotation],
  );
  return (
    <View
      role="progressbar"
      accessibilityLabel={label}
      className="size-icon-md"
    >
      <Animated.View style={style} className="size-icon-md">
        <Svg width="100%" height="100%" viewBox="0 0 32 32">
          <ThemedCircle
            cx={16}
            cy={16}
            r={14}
            fill="none"
            strokeWidth={4}
            strokeClassName="bg-muted-foreground"
            opacity={0.2}
          />
          <ThemedCircle
            cx={16}
            cy={16}
            r={14}
            fill="none"
            strokeWidth={4}
            strokeClassName="bg-muted-foreground"
            strokeDasharray={80}
            strokeDashoffset={60}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

function PlanSteps({ entries }: { entries: PlanEntry[] }) {
  const wide = useWide();
  const steps = (
    <View className={wide ? 'px-1 pb-2' : 'pb-1'}>
      {entries.map((entry) => {
        let stepIndicator: ReactNode;
        if (entry.status === 'in_progress' && Platform.OS !== 'web' && !wide) {
          stepIndicator = (
            <NativePlanSpinner label={`${entry.content} in progress`} />
          );
        } else if (entry.status === 'in_progress') {
          stepIndicator = (
            <IconSpinner
              colorClassName="accent-muted-foreground wide:accent-foreground"
              accessibilityLabel={`${entry.content} in progress`}
            />
          );
        } else if (entry.status === 'completed') {
          stepIndicator = (
            <Icon as={CheckIcon} className="text-muted-foreground" />
          );
        } else {
          stepIndicator = (
            <View className="size-icon-md">
              <Svg width="100%" height="100%" viewBox="0 0 32 32">
                <ThemedCircle
                  cx={16}
                  cy={16}
                  r={14}
                  fill="none"
                  strokeClassName="bg-ring wide:bg-muted-foreground"
                  strokeWidth={4}
                />
              </Svg>
            </View>
          );
        }
        return (
          <View
            key={entry.content}
            className={cn(
              'flex-row items-start px-4 wide:pl-1 wide:pr-0.5 py-2 gap-2.5 wide:gap-1.5',
              wide &&
                entry.status === 'in_progress' &&
                'rounded-md bg-foreground/5',
            )}
          >
            <View className="h-5 wide:h-4 shrink-0 justify-center">
              {stepIndicator}
            </View>
            <Text
              selectable={false}
              className={cn(
                'select-none',
                'flex-1 min-w-0 text-sm leading-5 wide:text-xs wide:leading-4 font-normal',
                (entry.status === 'completed' ||
                  (!wide && entry.status === 'pending')) &&
                  'text-muted-foreground',
                wide && entry.status === 'in_progress' && 'font-medium',
              )}
            >
              {entry.content}
            </Text>
          </View>
        );
      })}
    </View>
  );
  return wide ? <ScrollView className="max-h-66">{steps}</ScrollView> : steps;
}

export function ComposerStatusControls({
  status,
  disabled,
}: {
  status: ComposerStatusProps;
  disabled: boolean;
}) {
  const wide = useContentWide();
  const context = status.context;
  const percent =
    context && context.size > 0
      ? Math.round((context.used / context.size) * fullPercent)
      : 0;
  return (
    <View className="flex-row gap-1 items-center min-w-0">
      {status.usage && (
        <ComposerPopover
          label="Usage"
          width={320}
          trigger={
            <Button
              variant="ghost"
              disabled={disabled}
              accessibilityLabel="Usage"
              className={cn(
                'h-7 sm:h-7 py-0 gap-1.5',
                wide
                  ? 'w-auto px-1.5 has-[>svg]:px-1.5'
                  : 'w-7 px-0 has-[>svg]:px-0',
              )}
            >
              <Icon as={ClockCountdownIcon} className="text-muted-foreground" />
              <Text
                selectable={false}
                className={cn(
                  'select-none text-xs font-normal text-foreground',
                  !wide && 'hidden',
                )}
              >
                Usage
              </Text>
              <Text
                selectable={false}
                className={cn(
                  'select-none text-xs font-normal text-muted-foreground',
                  !wide && 'hidden',
                )}
              >
                {status.usage.limits[0]?.usedPercent}%
              </Text>
            </Button>
          }
        >
          {() => (
            <View className="pt-1 wide:pt-3">
              <View className="px-4 gap-1 pb-3">
                <Text
                  selectable={false}
                  className="select-none text-sm leading-5 font-medium"
                >
                  Usage
                </Text>
              </View>
              {status.usage?.limits.map((limit) => (
                <View key={limit.label} className="px-4 py-3 gap-1.5">
                  <View className="flex-row justify-between">
                    <Text
                      selectable={false}
                      className="select-none text-sm leading-5 font-normal"
                    >
                      {limit.label}
                    </Text>
                    <Text
                      selectable={false}
                      className="select-none text-sm leading-5 font-normal"
                    >
                      {limit.usedPercent}%
                    </Text>
                  </View>
                  <Meter percent={limit.usedPercent} />
                  <Text
                    selectable={false}
                    className="select-none text-xs leading-4 text-muted-foreground"
                  >
                    {limit.resets}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ComposerPopover>
      )}
      {context && (
        <ComposerPopover
          label="Context window"
          width={320}
          trigger={
            <Button
              variant="ghost"
              disabled={disabled}
              accessibilityLabel="Context window"
              className={cn(
                'h-7 sm:h-7 py-0 gap-1.5',
                wide
                  ? 'w-auto px-1.5 has-[>svg]:px-1.5'
                  : 'w-7 px-0 has-[>svg]:px-0',
              )}
            >
              <ContextRing percent={percent} />
              <Text
                selectable={false}
                className={cn(
                  'select-none text-xs font-normal text-foreground',
                  !wide && 'hidden',
                )}
              >
                Context
              </Text>
              <View className={cn('flex-row', !wide && 'hidden')}>
                <Text
                  selectable={false}
                  className="select-none text-xs leading-4 font-normal text-muted-foreground"
                >
                  {compactNumber(context.used)}
                </Text>
                <Text
                  selectable={false}
                  className={cn(
                    'select-none text-xs font-normal text-muted-foreground',
                    !wide && 'hidden',
                  )}
                >
                  {' '}
                  / {compactNumber(context.size)}
                </Text>
              </View>
            </Button>
          }
        >
          {(close) => (
            <View className="p-4 gap-3.5">
              <View className="px-0 gap-0.5">
                <Text
                  selectable={false}
                  className="select-none text-sm leading-5 font-medium"
                >
                  Context window
                </Text>
                <Text
                  selectable={false}
                  className="select-none text-xs leading-4 text-muted-foreground"
                >
                  Instructions, tools, files and the conversation the Agent
                  reads for its next reply.
                </Text>
              </View>
              <View className="px-0 gap-2">
                <View className="flex-row items-baseline gap-1">
                  <Text
                    selectable={false}
                    className="select-none text-xl leading-6 font-normal tracking-[-0.01em]"
                  >
                    {compactNumber(context.used)}
                  </Text>
                  <Text
                    selectable={false}
                    className="select-none text-sm text-muted-foreground"
                  >
                    / {compactNumber(context.size)} tokens
                  </Text>
                  <Text
                    selectable={false}
                    className={cn(
                      'select-none',
                      'ml-auto text-xs font-normal',
                      percent < smartZonePercent
                        ? 'text-success'
                        : 'text-warning',
                    )}
                  >
                    {percent}% ·{' '}
                    {percent < smartZonePercent ? 'Smart zone' : 'Dumb zone'}
                  </Text>
                </View>
                <Meter percent={percent} warning />
              </View>
              <View className="px-0 pt-3 gap-2">
                {[
                  {
                    label: 'Smart zone · below 20%',
                    explanation:
                      'Focused context helps the Agent follow instructions.',
                    color: 'bg-success',
                  },
                  {
                    label: 'Dumb zone · 20% and up',
                    explanation:
                      'Extra history can distract the Agent, even with space left.',
                    color: 'bg-warning',
                  },
                ].map((zone) => (
                  <View key={zone.label} className="flex-row gap-2">
                    <View
                      className={cn('size-2 mt-1.25 rounded-full', zone.color)}
                    />
                    <View className="flex-1 gap-0.5">
                      <Text
                        selectable={false}
                        className="select-none text-xs leading-4 font-normal"
                      >
                        {zone.label}
                      </Text>
                      <Text
                        selectable={false}
                        className="select-none text-xs leading-4 text-muted-foreground"
                      >
                        {zone.explanation}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
              <View className="px-0 gap-3 flex-row items-center">
                <Text
                  selectable={false}
                  className="select-none flex-1 text-xs leading-4 text-muted-foreground"
                >
                  Compact before the next task.
                </Text>
                <Button
                  variant="outline"
                  className="h-7 sm:h-7 py-0 rounded-md gap-1.5 px-2.5 has-[>svg]:px-2.5"
                  onPress={() => {
                    context.onCompact();
                    close();
                  }}
                >
                  <Icon as={ArrowsInLineVerticalIcon} />
                  <Text
                    selectable={false}
                    className="select-none text-xs leading-4 font-medium"
                  >
                    Compact
                  </Text>
                </Button>
              </View>
            </View>
          )}
        </ComposerPopover>
      )}
    </View>
  );
}

export function ComposerWorkChips({
  status,
  disabled,
}: {
  status: ComposerStatusProps;
  disabled: boolean;
}) {
  return (
    <>
      {(
        [
          ['Agents', RobotIcon, status.subagents],
          ['Shells', TerminalIcon, status.shells],
        ] as const
      ).map(
        ([label, icon, work]) =>
          work && (
            <Button
              key={label}
              variant="ghost"
              disabled={disabled}
              accessibilityLabel={`${label}: ${work.count}`}
              onPress={work.onPress}
              className="h-6 sm:h-6 py-0 px-2.5 has-[>svg]:px-2.5 gap-1.5 rounded-full border border-border bg-card shadow-composer"
            >
              <Icon as={icon} className="text-muted-foreground" />
              <Text
                selectable={false}
                className="select-none text-xs leading-4 font-normal"
              >
                {work.count} {label}
              </Text>
            </Button>
          ),
      )}
    </>
  );
}
