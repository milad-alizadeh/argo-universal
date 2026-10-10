import type { ContextUsage, PlanEntry } from '@repo/contracts';
import type * as React from 'react';
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
import { fullTurnDegrees } from '#lib/generic/motion';
import { withOccurrenceKeys } from '#lib/generic/occurrence-keys';
import { Text } from '#lib/generic/primitives/text';
import { cn } from '#lib/generic/utils';
import { useContentWide } from '#lib/product/content-layout';
import { Button } from '../../../lib/generic/primitives/button';
import {
  Pressable,
  contentActionClass,
} from '../../../lib/generic/primitives/pressable';
import { Icon, IconSpinner } from '../../../lib/generic/symbols/icon';
import { useWide } from '../../../lib/generic/use-wide';
import { ComposerPopover } from './composer-popover';

const successBackgroundClassName = 'bg-success';
const warningBackgroundClassName = 'bg-warning';
const mutedTextClassName = 'text-muted-foreground';
const unselectableTextClassName = 'select-none';

const fullPercent = 100;
// Context use below this percent is the Smart zone; at or above, the Dumb zone.
const smartZonePercent = 20;
const contextRingRadius = 5.5;
const maximumPlanStepsHeight = 264;
const spinnerTurnMilliseconds = 750;

function contextZone(percent: number): 'smart' | 'dumb' {
  return percent < smartZonePercent ? 'smart' : 'dumb';
}

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
}): React.JSX.Element {
  return (
    <View
      role="progressbar"
      accessibilityValue={{ min: 0, max: fullPercent, now: percent }}
      className={cn('h-1.5 rounded-full bg-muted overflow-hidden', className)}
    >
      <View
        className={cn(
          'h-full rounded-full bg-foreground',
          warning &&
            (contextZone(percent) === 'smart'
              ? successBackgroundClassName
              : warningBackgroundClassName),
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

function ContextRing({ percent }: { percent: number }): React.JSX.Element {
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
              contextZone(percent) === 'smart'
                ? successBackgroundClassName
                : warningBackgroundClassName
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

const compactNumber = (value: number): string =>
  new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 0 })
    .format(value)
    .toLowerCase();

export function ComposerPlan({
  entries,
  disabled,
}: {
  entries: PlanEntry[];
  disabled: boolean;
}): React.JSX.Element {
  const done = entries.filter((entry) => entry.status === 'completed').length;
  const wide = useContentWide();
  const [expanded, setExpanded] = useState(false);
  const [stepsHeight, setStepsHeight] = useState(0);
  const revealHeight = useSharedValue(0);
  useEffect(() => {
    revealHeight.set(
      withTiming(expanded ? stepsHeight : 0, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      }),
    );
    return (): void => cancelAnimation(revealHeight);
  }, [expanded, stepsHeight, revealHeight]);
  const revealStyle = useAnimatedStyle(
    () => ({
      height: revealHeight.get(),
      opacity: revealHeight.get() === 0 ? 0 : 1,
    }),
    [revealHeight],
  );
  const trigger = (
    <Pressable
      disabled={disabled}
      accessibilityLabel="Plan"
      accessibilityState={{ expanded: wide ? expanded : undefined }}
      aria-expanded={wide ? expanded : undefined}
      onPress={wide ? (): void => setExpanded(!expanded) : undefined}
      role="button"
      className={contentActionClass({
        variant: 'ghost',
        className: cn(
          'h-6 sm:h-6 py-0 px-2.5 gap-1.5 rounded-full border border-border bg-card',
          wide
            ? 'h-8 sm:h-8 py-0 w-full pl-2 pr-1.5 rounded-none border-0 bg-transparent shadow-none justify-start'
            : 'shadow-composer',
        ),
        disabled: disabled,
      })}
    >
      <View className="flex-row gap-0.5">
        {withOccurrenceKeys(entries, (entry) => entry.content).map(
          ({ item: entry, key }) => (
            <View
              key={key}
              className={cn(
                'h-1 rounded-xs bg-border',
                wide ? 'w-3.5' : 'w-1.5',
                entry.status === 'completed' && 'bg-foreground',
              )}
            />
          ),
        )}
      </View>
      <Text
        selectable={false}
        role={wide ? 'secondary' : 'badge'}
        className={unselectableTextClassName}
      >
        {wide ? `Plan ${done}/${entries.length}` : 'Plan'}
      </Text>
      {wide && (
        <>
          <Text
            selectable={false}
            numberOfLines={1}
            role="secondary"
            className="select-none flex-1 min-w-0 text-foreground"
          >
            {entries.find((entry) => entry.status === 'in_progress')?.content}
          </Text>
          <Icon
            size="sm"
            name="chevron-up"
            className={cn(
              'text-muted-foreground web:transition-transform web:duration-200',
              !expanded && 'rotate-180',
            )}
          />
        </>
      )}
    </Pressable>
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
              <Icon name="checklist" className="text-foreground" />
              <Text
                selectable={false}
                role={'heading'}

                className="select-none"
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
              <Text selectable={false} role="secondary" className="select-none">
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

function NativePlanSpinner({ label }: { label: string }): React.JSX.Element {
  const rotation = useSharedValue(0);
  useEffect(() => {
    rotation.set(
      withRepeat(
        withTiming(fullTurnDegrees, {
          duration: spinnerTurnMilliseconds,
          easing: Easing.linear,
        }),
        -1,
      ),
    );
    return (): void => cancelAnimation(rotation);
  }, [rotation]);
  const style = useAnimatedStyle(
    () => ({ transform: [{ rotate: `${rotation.get()}deg` }] }),
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

function PlanSteps({ entries }: { entries: PlanEntry[] }): React.JSX.Element {
  const wide = useWide();
  const occurrences = new Map<string, number>();
  const steps = (
    <View className={wide ? 'px-1 pb-2' : 'pb-1'}>
      {entries.map((entry) => {
        const occurrence = occurrences.get(entry.content) ?? 0;
        occurrences.set(entry.content, occurrence + 1);
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
          stepIndicator = <Icon name="check" className={mutedTextClassName} />;
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
            key={`${entry.content}#${occurrence}`}
            className={cn(
              'flex-row items-start px-4 wide:pl-1 wide:pr-0.5 py-2 gap-2.5 wide:gap-1.5',
              wide &&
                entry.status === 'in_progress' &&
                'rounded-md bg-foreground/5',
            )}
          >
            <View className="h-6 wide:h-5 shrink-0 justify-center">
              {stepIndicator}
            </View>
            <Text
              selectable={false}
              role="body"
              className={cn(
                'select-none flex-1 min-w-0',
                (entry.status === 'completed' ||
                  (!wide && entry.status === 'pending')) &&
                  mutedTextClassName,
              )}
            >
              {entry.content}
            </Text>
          </View>
        );
      })}
    </View>
  );
  return wide ? (
    <ScrollView style={{ maxHeight: maximumPlanStepsHeight }}>
      {steps}
    </ScrollView>
  ) : (
    steps
  );
}

export function ComposerStatusControls({
  status,
  disabled,
}: {
  status: ComposerStatusProps;
  disabled: boolean;
}): React.JSX.Element {
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
            <Pressable
              disabled={disabled}
              accessibilityLabel="Usage"
              role="button"
              className={contentActionClass({
                variant: 'ghost',
                className: cn(
                  'h-7 sm:h-7 py-0 gap-1.5',
                  wide
                    ? 'w-auto px-1.5 has-[>[data-icon]]:px-1.5'
                    : 'w-7 px-0 has-[>[data-icon]]:px-0',
                ),
                disabled: disabled,
              })}
            >
              <Icon name="scheduled" className={mutedTextClassName} />
              <Text
                selectable={false}
                role="secondary"
                className={cn('select-none text-foreground', !wide && 'hidden')}
              >
                Usage
              </Text>
              <Text
                selectable={false}
                role="secondary"
                className={cn(unselectableTextClassName, !wide && 'hidden')}
              >
                {status.usage.limits[0]?.usedPercent}%
              </Text>
            </Pressable>
          }
        >
          {() => (
            <View className="pt-1 wide:pt-3">
              <View className="px-4 gap-1 pb-3">
                <Text
                  selectable={false}
                  role={'heading'}

                  className="select-none"
                >
                  Usage
                </Text>
              </View>
              {status.usage?.limits.map((limit) => (
                <View key={limit.label} className="px-4 py-3 gap-1.5">
                  <View className="flex-row justify-between">
                    <Text
                      selectable={false}
                      role="body"
                      className="select-none"
                    >
                      {limit.label}
                    </Text>
                    <Text
                      selectable={false}
                      role="body"
                      className="select-none"
                    >
                      {limit.usedPercent}%
                    </Text>
                  </View>
                  <Meter percent={limit.usedPercent} />
                  <Text
                    selectable={false}
                    role="secondary"
                    className="select-none"
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
            <Pressable
              disabled={disabled}
              accessibilityLabel="Context window"
              role="button"
              className={contentActionClass({
                variant: 'ghost',
                className: cn(
                  'h-7 sm:h-7 py-0 gap-1.5',
                  wide
                    ? 'w-auto px-1.5 has-[>[data-icon]]:px-1.5'
                    : 'w-7 px-0 has-[>[data-icon]]:px-0',
                ),
                disabled: disabled,
              })}
            >
              <ContextRing percent={percent} />
              <Text
                selectable={false}
                role="secondary"
                className={cn('select-none text-foreground', !wide && 'hidden')}
              >
                Context
              </Text>
              <View className={cn('flex-row', !wide && 'hidden')}>
                <Text
                  selectable={false}
                  role="secondary"
                  className="select-none"
                >
                  {compactNumber(context.used)}
                </Text>
                <Text
                  selectable={false}
                  role="secondary"
                  className={cn(unselectableTextClassName, !wide && 'hidden')}
                >
                  {' '}
                  / {compactNumber(context.size)}
                </Text>
              </View>
            </Pressable>
          }
        >
          {(close) => (
            <View className="p-4 gap-3.5">
              <View className="px-0 gap-0.5">
                <Text
                  selectable={false}
                  role={'heading'}

                  className="select-none"
                >
                  Context window
                </Text>
                <Text
                  selectable={false}
                  role="secondary"
                  className="select-none"
                >
                  Instructions, tools, files and the conversation the Agent
                  reads for its next reply.
                </Text>
              </View>
              <View className="px-0 gap-2">
                <View className="flex-row items-baseline gap-1">
                  <Text selectable={false} role="title" className="select-none">
                    {compactNumber(context.used)}
                  </Text>
                  <Text
                    selectable={false}
                    role="body"
                    className="select-none text-muted-foreground"
                  >
                    / {compactNumber(context.size)} tokens
                  </Text>
                  <Text
                    selectable={false}
                    role="secondary"
                    className={cn(
                      unselectableTextClassName,
                      'ml-auto',
                      contextZone(percent) === 'smart'
                        ? 'text-success'
                        : 'text-warning',
                    )}
                  >
                    {percent}% ·{' '}
                    {contextZone(percent) === 'smart'
                      ? 'Smart zone'
                      : 'Dumb zone'}
                  </Text>
                </View>
                <Meter percent={percent} warning />
              </View>
              <View className="px-0 pt-3 gap-2">
                {[
                  {
                    label: `Smart zone · below ${smartZonePercent}%`,
                    explanation:
                      'Focused context helps the Agent follow instructions.',
                    color: successBackgroundClassName,
                  },
                  {
                    label: `Dumb zone · ${smartZonePercent}% and up`,
                    explanation:
                      'Extra history can distract the Agent, even with space left.',
                    color: warningBackgroundClassName,
                  },
                ].map((zone) => (
                  <View key={zone.label} className="flex-row gap-2">
                    <View
                      className={cn('size-2 mt-1.25 rounded-full', zone.color)}
                    />
                    <View className="flex-1 gap-0.5">
                      <Text
                        selectable={false}
                        role="secondary"
                        className="select-none text-foreground"
                      >
                        {zone.label}
                      </Text>
                      <Text
                        selectable={false}
                        role="secondary"
                        className="select-none"
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
                  role="secondary"
                  className="select-none flex-1"
                >
                  Compact before the next task.
                </Text>
                <Button
                  variant="outline"
                  className="web:sm:min-h-0 h-7 sm:h-7 py-0 rounded-md gap-1.5 px-2.5 has-[>[data-icon]]:px-2.5"
                  onPress={() => {
                    context.onCompact();
                    close();
                  }}
                  label={'Compact'}
                  icon={'compaction'}
                  appearance="content"
                  labelClassName={'select-none type-control'}
                />
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
}): React.JSX.Element {
  return (
    <>
      {(
        [
          ['Subagents', 'agent', status.subagents],
          ['Shells', 'terminal', status.shells],
        ] as const
      ).map(
        ([label, icon, work]) =>
          work && (
            <Pressable
              key={label}
              disabled={disabled}
              accessibilityLabel={`${label}: ${work.count}`}
              onPress={work.onPress}
              role="button"
              className={contentActionClass({
                variant: 'ghost',
                className:
                  'h-6 sm:h-6 py-0 px-2.5 has-[>[data-icon]]:px-2.5 gap-1.5 rounded-full border border-border bg-card shadow-composer',
                disabled: disabled,
              })}
            >
              <Icon name={icon} className={mutedTextClassName} />
              <View className="flex-row items-center gap-1">
                <Text
                  selectable={false}
                  role="badge"
                  className={cn(
                    unselectableTextClassName,
                    work.running ? 'text-success' : mutedTextClassName,
                  )}
                >
                  {work.count}
                </Text>
                <Text selectable={false} role="badge" className="select-none">
                  {label}
                </Text>
              </View>
            </Pressable>
          ),
      )}
    </>
  );
}
