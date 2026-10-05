import type { ContextUsage, PlanEntry } from '@repo/contracts';
import {
  ArrowsInLineVerticalIcon,
  CaretUpIcon,
  CheckIcon,
  CircleIcon,
  GaugeIcon,
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
  usage?: {
    limits: { label: string; usedPercent: number; resets: string }[];
  };
  context?: ContextUsage & { onCompact: () => void };
}

function Meter({
  percent,
  warning = false,
}: {
  percent: number;
  warning?: boolean;
}) {
  return (
    <View
      role="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      className="h-1.5 rounded-full bg-muted overflow-hidden"
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
          className="absolute top-0 bottom-0 w-px bg-background"
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
      width={360}
      trigger={
        <Button
          variant="ghost"
          disabled={disabled}
          accessibilityLabel="Plan"
          className="h-7 sm:h-7 px-1.5 gap-1.5 wide:w-full justify-start"
        >
          <View className="flex-row gap-0.5">
            {entries.map((entry) => (
              <View
                key={entry.content}
                className={cn(
                  'w-2 wide:w-3.5 h-1 rounded-xs bg-border',
                  entry.status === 'completed' && 'bg-foreground',
                )}
              />
            ))}
          </View>
          <Text
            selectable={false}
            className="select-none hidden wide:flex text-xs"
          >
            Plan
          </Text>
          <Text
            selectable={false}
            className="select-none text-xs text-muted-foreground font-medium"
          >
            {done}/{entries.length}
          </Text>
          <Text
            selectable={false}
            numberOfLines={1}
            className="select-none hidden wide:flex flex-1 min-w-0 text-sm leading-5 text-foreground"
          >
            {entries.find((entry) => entry.status === 'in_progress')?.content}
          </Text>
          <Icon
            as={CaretUpIcon}
            className="hidden wide:flex size-3.5 text-muted-foreground"
          />
        </Button>
      }
    >
      {() => (
        <View className="py-2 wide:p-4 gap-1">
          <Text
            selectable={false}
            className="select-none px-4 wide:px-0 text-lg wide:text-sm font-semibold"
          >
            Plan
          </Text>
          {entries.map((entry) => (
            <View
              key={entry.content}
              className="flex-row items-start px-4 wide:px-0 py-2 gap-3"
            >
              {entry.status === 'in_progress' ? (
                <ActivityIndicator
                  size="small"
                  colorClassName="accent-muted-foreground"
                  accessibilityLabel={`${entry.content} in progress`}
                  className="size-4 mt-1"
                />
              ) : (
                <Icon
                  as={entry.status === 'completed' ? CheckIcon : CircleIcon}
                  className="size-4 mt-1 text-muted-foreground"
                />
              )}
              <Text
                selectable={false}
                className={cn(
                  'select-none',
                  'flex-1 text-base wide:text-sm',
                  entry.status === 'completed' && 'text-muted-foreground',
                )}
              >
                {entry.content}
              </Text>
            </View>
          ))}
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
    <View className="flex-row gap-1 items-center">
      {status.usage && (
        <ComposerPopover
          label="Usage"
          width={320}
          trigger={
            <Button
              variant="ghost"
              disabled={disabled}
              accessibilityLabel="Usage"
              className="h-7 sm:h-7 px-1.5 gap-1"
            >
              <Icon as={GaugeIcon} className="size-3.5 text-muted-foreground" />
              <Text
                selectable={false}
                className="select-none hidden wide:flex text-xs font-medium"
              >
                Usage
              </Text>
              <Text
                selectable={false}
                className="select-none text-xs text-muted-foreground"
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
                  className="select-none text-lg wide:text-sm font-semibold"
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
                      className="select-none text-base wide:text-sm"
                    >
                      {limit.label}
                    </Text>
                    <Text
                      selectable={false}
                      className="select-none text-base wide:text-sm font-semibold"
                    >
                      {limit.usedPercent}%
                    </Text>
                  </View>
                  <Meter percent={limit.usedPercent} />
                  <Text
                    selectable={false}
                    className="select-none text-sm wide:text-xs text-muted-foreground"
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
              className="h-7 sm:h-7 px-1.5 gap-1"
            >
              <ContextRing percent={percent} />
              <Text
                selectable={false}
                className="select-none hidden wide:flex text-xs font-medium"
              >
                Context
              </Text>
              <Text
                selectable={false}
                className="select-none text-xs text-muted-foreground"
              >
                {compactNumber(context.used)} / {compactNumber(context.size)}
              </Text>
            </Button>
          }
        >
          {(close) => (
            <View className="pt-1 wide:p-4 gap-3.5">
              <View className="px-4 wide:px-0 gap-1">
                <Text
                  selectable={false}
                  className="select-none text-lg wide:text-sm font-semibold"
                >
                  Context window
                </Text>
                <Text
                  selectable={false}
                  className="select-none text-sm wide:text-xs text-muted-foreground"
                >
                  Instructions, tools, files and the conversation the Agent
                  reads for its next reply.
                </Text>
              </View>
              <View className="px-4 wide:px-0 gap-2">
                <View className="flex-row items-baseline gap-1">
                  <Text
                    selectable={false}
                    className="select-none text-xl font-semibold"
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
                      'ml-auto text-xs font-medium',
                      percent < 20 ? 'text-success' : 'text-warning',
                    )}
                  >
                    {percent}% · {percent < 20 ? 'Smart zone' : 'Dumb zone'}
                  </Text>
                </View>
                <Meter percent={percent} warning />
              </View>
              <View className="border-t border-border px-4 wide:px-0 py-4 wide:py-3 gap-3">
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
                        className="select-none text-base wide:text-xs font-medium"
                      >
                        {zone.label}
                      </Text>
                      <Text
                        selectable={false}
                        className="select-none text-sm wide:text-xs text-muted-foreground"
                      >
                        {zone.explanation}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
              <View className="px-4 wide:px-0 gap-3 wide:flex-row wide:items-center">
                <Text
                  selectable={false}
                  className="select-none wide:flex-1 text-sm wide:text-xs text-muted-foreground"
                >
                  Compact before the next task.
                </Text>
                <Button
                  variant="outline"
                  className="h-12 sm:h-12 wide:h-7 wide:sm:h-7 rounded-xl wide:rounded-md gap-1.5"
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
                    className="select-none text-base wide:text-xs"
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
