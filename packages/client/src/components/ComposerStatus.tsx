import type { ContextUsage, PlanEntry } from '@repo/contracts';
import {
  ArrowsInLineVerticalIcon,
  CaretUpIcon,
  CheckIcon,
  CircleIcon,
  GaugeIcon,
  ListChecksIcon,
  RobotIcon,
  TerminalIcon,
} from 'phosphor-react-native';
import { ActivityIndicator, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { withUniwind } from 'uniwind';
import { cn } from '#lib/utils';
import { Button } from '#primitives/button';
import { Text } from '#primitives/text';
import { ComposerPopover } from './ComposerPopover';
import { Icon } from './Icon';

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
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      className={cn('h-1.5 rounded-full bg-muted overflow-hidden', className)}
    >
      <View
        className={cn(
          'h-full rounded-full bg-foreground',
          warning && (percent < 20 ? 'bg-success' : 'bg-warning'),
        )}
        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
      />
      {warning && (
        <View
          className="absolute top-0 bottom-0 w-0.5 bg-background"
          style={{ left: '20%' }}
        />
      )}
    </View>
  );
}
const ThemedCircle = withUniwind(Circle, {
  stroke: { fromClassName: 'className', styleProperty: 'color' },
});

function ContextRing({ percent }: { percent: number }) {
  const circumference = 2 * Math.PI * 5.5;
  return (
    <View className="size-3.5 shrink-0">
      <Svg width={14} height={14} viewBox="0 0 14 14">
        <ThemedCircle
          cx={7}
          cy={7}
          r={5.5}
          fill="none"
          className="text-border"
          strokeWidth={2}
        />
        <ThemedCircle
          cx={7}
          cy={7}
          r={5.5}
          fill="none"
          className={percent < 20 ? 'text-success' : 'text-warning'}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={`${(circumference * Math.max(0, Math.min(100, percent))) / 100} ${circumference}`}
          transform="rotate(-90 7 7)"
        />
      </Svg>
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
  return (
    <ComposerPopover
      label="Plan"
      width={420}
      trigger={
        <Button
          variant="ghost"
          disabled={disabled}
          accessibilityLabel="Plan"
          className="h-7 sm:h-7 px-0 has-[>svg]:px-0 gap-2 wide:w-full justify-start"
        >
          <Icon
            as={ListChecksIcon}
            className="size-3.5 text-muted-foreground"
          />
          <View className="flex-row gap-0.5">
            {entries.map((entry) => (
              <View
                key={entry.content}
                className={cn(
                  'w-1.5 wide:w-3.5 h-1 rounded-xs bg-border',
                  entry.status === 'completed' && 'bg-foreground',
                )}
              />
            ))}
          </View>
          <Text
            selectable={false}
            className="select-none hidden wide:flex text-xs font-normal text-muted-foreground"
          >
            Plan
          </Text>
          <Text
            selectable={false}
            className="select-none text-xs text-muted-foreground font-normal"
          >
            {done}/{entries.length}
          </Text>
          <Text
            selectable={false}
            numberOfLines={1}
            className="select-none hidden wide:flex flex-1 min-w-0 text-xs leading-4 font-normal text-foreground"
          >
            {entries.find((entry) => entry.status === 'in_progress')?.content}
          </Text>
          <View className="hidden wide:flex">
            <Icon as={CaretUpIcon} className="size-3 text-muted-foreground" />
          </View>
        </Button>
      }
    >
      {() => (
        <View>
          <View className="px-4 py-3 gap-1.5">
            <View className="flex-row items-center gap-2">
              <Icon
                as={ListChecksIcon}
                className="size-3.5 text-muted-foreground"
              />
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
                  percent={(done / entries.length) * 100}
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
          <View className="py-1 border-t border-border">
            {entries.map((entry) => (
              <View
                key={entry.content}
                className="flex-row items-start px-4 py-2 gap-2.5"
              >
                {entry.status === 'in_progress' ? (
                  <ActivityIndicator
                    size="small"
                    colorClassName="accent-muted-foreground"
                    accessibilityLabel={`${entry.content} in progress`}
                    className="size-3.5 mt-0.5"
                  />
                ) : (
                  <Icon
                    as={entry.status === 'completed' ? CheckIcon : CircleIcon}
                    className="size-3.5 mt-0.5 text-muted-foreground"
                  />
                )}
                <Text
                  selectable={false}
                  className={cn(
                    'select-none',
                    'flex-1 text-sm leading-5 font-normal',
                    entry.status === 'completed' && 'text-muted-foreground',
                  )}
                >
                  {entry.content}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ComposerPopover>
  );
}

export function ComposerStatusControls({
  status,
  disabled,
}: {
  status: ComposerStatusProps;
  disabled: boolean;
}) {
  const context = status.context;
  const percent =
    context && context.size > 0
      ? Math.round((context.used / context.size) * 100)
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
              className="h-7 sm:h-7 px-1 has-[>svg]:px-1 wide:px-1.5 wide:has-[>svg]:px-1.5 gap-1"
            >
              <Icon as={GaugeIcon} className="size-3.5 text-muted-foreground" />
              <Text
                selectable={false}
                className="select-none hidden wide:flex text-xs font-normal text-foreground"
              >
                Usage
              </Text>
              <Text
                selectable={false}
                className="select-none text-xs font-normal text-muted-foreground"
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
                <View
                  key={limit.label}
                  className="p-4 gap-2 border-t border-border"
                >
                  <View className="flex-row justify-between">
                    <Text
                      selectable={false}
                      className="select-none text-sm leading-5 font-normal"
                    >
                      {limit.label}
                    </Text>
                    <Text
                      selectable={false}
                      className="select-none text-sm leading-5 font-medium"
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
              className="h-7 sm:h-7 px-1 has-[>svg]:px-1 wide:px-1.5 wide:has-[>svg]:px-1.5 gap-1"
            >
              <ContextRing percent={percent} />
              <Text
                selectable={false}
                className="select-none hidden wide:flex text-xs font-normal text-foreground"
              >
                Context
              </Text>
              <View className="flex-row">
                <Text
                  selectable={false}
                  className="select-none text-xs leading-4 font-normal text-muted-foreground"
                >
                  {compactNumber(context.used)}
                </Text>
                <Text
                  selectable={false}
                  className="select-none hidden wide:flex text-xs font-normal text-muted-foreground"
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
              <View className="px-0 gap-1">
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
                    className="select-none text-xl leading-6 font-normal"
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
                      percent < 20 ? 'text-success' : 'text-warning',
                    )}
                  >
                    {percent}% · {percent < 20 ? 'Smart zone' : 'Dumb zone'}
                  </Text>
                </View>
                <Meter percent={percent} warning />
              </View>
              <View className="border-t border-border px-0 pt-3 gap-2">
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
                  className="h-7 sm:h-7 rounded-md gap-1.5 px-2.5 has-[>svg]:px-2.5"
                  onPress={() => {
                    context.onCompact();
                    close();
                  }}
                >
                  <Icon
                    as={ArrowsInLineVerticalIcon}
                    className="size-4 wide:size-3.5"
                  />
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
      {(status.subagents || status.shells) && (
        <View className="wide:hidden flex-row items-center border-l border-border pl-1">
          {(
            [
              ['Subagents', RobotIcon, status.subagents],
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
                  className="h-7 sm:h-7 px-1 has-[>svg]:px-1 gap-1"
                >
                  <Icon as={icon} className="size-3.5" />
                  <Text
                    selectable={false}
                    className={cn(
                      'select-none text-xs leading-4 font-normal text-muted-foreground',
                      work.running && 'text-success',
                    )}
                  >
                    {work.count}
                  </Text>
                </Button>
              ),
          )}
        </View>
      )}
    </View>
  );
}
