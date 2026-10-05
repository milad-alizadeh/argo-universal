import type {
  AgentInfo,
  SessionConfigOption,
  SessionConfigSelectOption,
} from '@repo/contracts';
import {
  CaretDownIcon,
  CheckIcon,
  ClipboardTextIcon,
  GitBranchIcon,
  HourglassSimpleIcon,
  LightningIcon,
  PencilIcon,
  ShieldCheckIcon,
  ShieldSlashIcon,
  ShieldWarningIcon,
  SparkleIcon,
} from 'phosphor-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { withUniwind } from 'uniwind';
import { cn } from '#lib/utils';
import { Button } from '#primitives/button';
import { Input } from '#primitives/input';
import { Label } from '#primitives/label';
import { Slider } from '#primitives/slider';
import { Switch } from '#primitives/switch';
import { Text } from '#primitives/text';
import { useWide } from '../navigation/use-wide';
import { ComposerPopover } from './ComposerPopover';
import { Icon } from './Icon';

type SelectConfiguration = Extract<SessionConfigOption, { type: 'select' }>;
export interface ComposerConfigurationProps {
  agents: AgentInfo[];
  agent: string;
  configOptions: SessionConfigOption[];
  onConfigChange: (configId: string, value: string | boolean) => void;
  onAgentChange?: (agent: string) => void;
  onAgentSetup?: (agent: string) => void;
  fastMode?: boolean;
  onFastModeChange?: (enabled: boolean) => void;
  turnRunning?: boolean;
  checkout: {
    branch: string;
    currentBranch?: string;
    branches: string[];
    newWorktree: boolean;
    onBranchChange?: (branch: string) => void;
    onNewWorktreeChange?: (enabled: boolean) => void;
    path?: string;
    onOpenFolder?: () => void;
    onOpenTerminal?: () => void;
  };
}

function choices(option?: SelectConfiguration): SessionConfigSelectOption[] {
  return (
    option?.options.flatMap((entry) =>
      'groupId' in entry ? entry.options : [entry],
    ) ?? []
  );
}
function selection(
  configuration: ComposerConfigurationProps,
  category: string,
) {
  return configuration.configOptions.find(
    (option): option is SelectConfiguration =>
      option.type === 'select' && option.category === category,
  );
}
function configurationIcon(name?: string) {
  return (
    {
      ShieldCheck: ShieldCheckIcon,
      Pencil: PencilIcon,
      ClipboardList: ClipboardTextIcon,
      Sparkles: SparkleIcon,
      ShieldOff: ShieldSlashIcon,
    }[name ?? ''] ?? ShieldWarningIcon
  );
}
const ThemedLogo = withUniwind(SvgXml, {
  color: { fromClassName: 'className', styleProperty: 'color' },
});

function Logo({ agent, size = 14 }: { agent?: AgentInfo; size?: number }) {
  return agent ? (
    <ThemedLogo
      testID="composer-agent-icon"
      xml={agent.logo}
      className="text-foreground"
      width={size}
      height={size}
    />
  ) : null;
}
function Choice({
  selected,
  label,
  description,
  onPress,
  dangerous = false,
  leading,
}: {
  selected: boolean;
  label: string;
  description?: string;
  onPress: () => void;
  dangerous?: boolean;
  leading?: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      aria-pressed={selected}
      onPress={onPress}
      className={cn(
        'min-h-15 wide:min-h-8 h-auto sm:h-auto justify-start gap-3 wide:gap-2 px-4 wide:px-2 py-2 wide:py-1.5 rounded-none wide:rounded-sm',
        'web:focus-visible:ring-0 web:focus-visible:bg-accent',
        selected && 'bg-accent',
      )}
    >
      {leading}
      <View className="flex-1 min-w-0 gap-0.5">
        <Text
          selectable={false}
          className={cn(
            'select-none',
            'text-base wide:text-sm leading-6 wide:leading-5 font-medium',
            dangerous && 'text-destructive',
          )}
        >
          {label}
        </Text>
        {description && (
          <Text
            selectable={false}
            className="select-none text-sm wide:text-xs leading-5 wide:leading-4 text-muted-foreground"
          >
            {description}
          </Text>
        )}
      </View>
      <View className="size-5 wide:size-4 items-center justify-center">
        {selected && <Icon as={CheckIcon} className="size-5 wide:size-4" />}
      </View>
    </Button>
  );
}

export function ComposerAgentControl({
  configuration,
  disabled,
}: {
  configuration: ComposerConfigurationProps;
  disabled: boolean;
}) {
  const wide = useWide();
  const current = configuration.agents.find(
    (agent) => agent.agent === configuration.agent,
  );
  if (!configuration.onAgentChange)
    return (
      <View className="w-6 h-8 items-center justify-center">
        <Logo agent={current} />
      </View>
    );
  return (
    <ComposerPopover
      label="Agent"
      trigger={
        <Button
          variant="ghost"
          disabled={disabled}
          accessibilityLabel="Choose Agent"
          size="icon"
          className="size-8 sm:size-8"
        >
          <Logo agent={current} />
        </Button>
      }
    >
      {(close) => (
        <View className="py-2 wide:p-1">
          <Text
            selectable={false}
            className="select-none px-4 wide:px-2 pt-1 pb-2 text-lg wide:text-xs font-semibold wide:font-medium text-foreground wide:text-muted-foreground"
          >
            Agent
          </Text>
          {configuration.agents.map((agent) => (
            <View key={agent.agent} className="flex-row items-center gap-2">
              <Button
                variant="ghost"
                disabled={agent.availability !== 'available'}
                accessibilityLabel={`Select ${agent.label}`}
                accessibilityState={{
                  selected: agent.agent === configuration.agent,
                }}
                aria-pressed={agent.agent === configuration.agent}
                onPress={() => {
                  configuration.onAgentChange?.(agent.agent);
                  close();
                }}
                className={cn(
                  'flex-1 min-w-0 min-h-15 wide:min-h-13 h-auto sm:h-auto px-4 wide:px-2 py-2 justify-start gap-3 wide:gap-2.5 web:focus-visible:ring-0 web:focus-visible:bg-accent',
                  agent.agent === configuration.agent && 'bg-accent',
                )}
              >
                <View className="size-9 wide:size-4 items-center justify-center rounded-full bg-muted wide:bg-transparent">
                  <Logo agent={agent} size={wide ? 16 : 20} />
                </View>
                <View className="flex-1 min-w-0 gap-0.5">
                  <Text
                    selectable={false}
                    className="select-none text-base wide:text-sm leading-6 wide:leading-5 font-medium"
                  >
                    {agent.label}
                  </Text>
                  <Text
                    selectable={false}
                    className={cn(
                      'select-none text-sm wide:text-xs leading-5 wide:leading-4 text-muted-foreground',
                      agent.availability !== 'available' && 'text-warning',
                    )}
                  >
                    {agent.availability === 'available'
                      ? 'Ready'
                      : agent.availability === 'not_signed_in'
                        ? 'Not signed in'
                        : agent.availability === 'not_installed'
                          ? 'Not installed'
                          : 'Unavailable'}
                  </Text>
                </View>
                {agent.agent === configuration.agent && (
                  <Icon as={CheckIcon} className="size-4.5 wide:size-3.5" />
                )}
              </Button>
              {agent.availability !== 'available' &&
                configuration.onAgentSetup && (
                  <Button
                    variant="outline"
                    accessibilityLabel={`Set up ${agent.label}`}
                    className="h-8 sm:h-8 wide:h-6 wide:sm:h-6 px-3 wide:px-2"
                    onPress={() => configuration.onAgentSetup?.(agent.agent)}
                  >
                    <Text
                      selectable={false}
                      className="select-none text-sm wide:text-xs"
                    >
                      {agent.availability === 'not_signed_in'
                        ? 'Sign in'
                        : 'Install'}
                    </Text>
                  </Button>
                )}
            </View>
          ))}
        </View>
      )}
    </ComposerPopover>
  );
}

export function ComposerModelControl({
  configuration,
  disabled,
}: {
  configuration: ComposerConfigurationProps;
  disabled: boolean;
}) {
  const model = selection(configuration, 'model');
  const effort = selection(configuration, 'thought_level');
  const current = choices(model).find(
    (choice) => choice.value === model?.currentValue,
  );
  const levels = current?._meta?.argo?.supportedEffortLevels;
  const effortChoices = choices(effort).filter(
    (choice) =>
      !levels || levels.includes(choice.value) || choice.value === 'default',
  );
  const selectedEffortIndex = effortChoices.findIndex(
    (choice) => choice.value === effort?.currentValue,
  );
  const supportsEffort =
    current?._meta?.argo?.supportsEffort !== false && effortChoices.length > 0;
  const effortLabel = choices(effort).find(
    (choice) => choice.value === effort?.currentValue,
  )?.name;
  if (!model) return null;
  return (
    <ComposerPopover
      label="Model and effort"
      className="shrink min-w-0"
      width={Math.max(300, effortChoices.length * 56 + 24)}
      trigger={
        <Button
          variant="ghost"
          disabled={disabled}
          accessibilityLabel="Model and effort"
          className="h-8 sm:h-8 px-2 has-[>svg]:px-2 gap-1 wide:gap-1.5 shrink min-w-0"
        >
          <Text
            selectable={false}
            numberOfLines={1}
            className="select-none text-sm font-medium min-w-0 shrink"
          >
            {current?._meta?.argo?.shortName ??
              current?.name.replace(/\s*\(recommended\)\s*$/i, '')}
          </Text>
          {supportsEffort && effortLabel && (
            <Text
              selectable={false}
              className="select-none text-sm font-normal text-muted-foreground shrink-0"
              numberOfLines={1}
            >
              {effortLabel}
            </Text>
          )}
          {configuration.fastMode && (
            <View
              accessible
              accessibilityRole="image"
              accessibilityLabel="Fast mode enabled"
            >
              <Icon as={LightningIcon} weight="fill" className="size-3.5" />
            </View>
          )}
          <Icon
            as={CaretDownIcon}
            className="size-3 wide:size-3.5 text-muted-foreground"
          />
        </Button>
      }
    >
      {() => (
        <View className="pb-2 wide:pb-0">
          <View className="flex-row items-center justify-between px-4 wide:px-3 pt-1 wide:pt-2 pb-2">
            <Text
              selectable={false}
              className="select-none text-lg wide:text-xs leading-5.5 wide:leading-4 font-semibold wide:font-medium text-foreground wide:text-muted-foreground"
            >
              Model
            </Text>
            {current?._meta?.argo?.supportsFastMode &&
              configuration.onFastModeChange && (
                <Button
                  variant={configuration.fastMode ? 'default' : 'outline'}
                  accessibilityLabel="Fast mode"
                  accessibilityRole="switch"
                  role="switch"
                  accessibilityState={{ checked: !!configuration.fastMode }}
                  aria-checked={!!configuration.fastMode}
                  className="h-8 sm:h-8 wide:h-5.5 wide:sm:h-5.5 rounded-full px-3 wide:px-2 gap-1"
                  onPress={() =>
                    configuration.onFastModeChange?.(!configuration.fastMode)
                  }
                >
                  <Icon
                    as={LightningIcon}
                    className={cn(
                      'size-3.5',
                      configuration.fastMode
                        ? 'text-primary-foreground'
                        : 'text-muted-foreground',
                    )}
                  />
                  <Text
                    selectable={false}
                    className="select-none text-sm wide:text-xs"
                  >
                    Fast
                  </Text>
                </Button>
              )}
          </View>
          <View className="wide:p-1 gap-0.5">
            {choices(model).map((choice) => (
              <Choice
                key={choice.value}
                selected={choice.value === model.currentValue}
                label={choice.name}
                description={
                  configuration.fastMode &&
                  !choice._meta?.argo?.supportsFastMode
                    ? 'No fast mode, turns it off'
                    : choice.description
                }
                onPress={() => {
                  if (!choice._meta?.argo?.supportsFastMode)
                    configuration.onFastModeChange?.(false);
                  configuration.onConfigChange(model.configId, choice.value);
                }}
              />
            ))}
          </View>
          {supportsEffort && effort && (
            <View className="border-t border-border px-4 wide:px-3 pt-4 wide:pt-3 pb-2 wide:pb-3 gap-3.5 wide:gap-2.5">
              <View className="gap-0.5">
                <Text
                  selectable={false}
                  className="select-none text-base wide:text-xs font-semibold wide:font-medium"
                >
                  Effort
                </Text>
                <Text
                  selectable={false}
                  className="select-none text-sm wide:text-xs text-muted-foreground"
                >
                  More effort trades speed for deeper reasoning.
                </Text>
              </View>
              <View>
                <Slider
                  accessibilityLabel="Effort"
                  valueLabel={effortLabel ?? effortChoices[0]?.name ?? ''}
                  minimumValue={0}
                  maximumValue={Math.max(1, effortChoices.length - 1)}
                  step={1}
                  value={Math.max(0, selectedEffortIndex)}
                  onValueChange={(index) => {
                    const choice = effortChoices[Math.round(index)];
                    if (choice)
                      configuration.onConfigChange(
                        effort.configId,
                        choice.value,
                      );
                  }}
                />
                <View className="flex-row justify-between">
                  {effortChoices.map((choice) => (
                    <Button
                      key={choice.value}
                      variant="ghost"
                      accessibilityLabel={`Set effort to ${choice.name}`}
                      aria-pressed={choice.value === effort.currentValue}
                      onPress={() =>
                        configuration.onConfigChange(
                          effort.configId,
                          choice.value,
                        )
                      }
                      className="h-6 sm:h-6 px-0 py-0 active:bg-transparent hover:bg-transparent dark:hover:bg-transparent"
                    >
                      <Text
                        selectable={false}
                        numberOfLines={1}
                        className={cn(
                          'text-xs text-muted-foreground',
                          choice.value === effort.currentValue &&
                            'font-semibold text-foreground',
                        )}
                      >
                        {choice.name}
                      </Text>
                    </Button>
                  ))}
                </View>
              </View>
            </View>
          )}
          {configuration.turnRunning && (
            <View className="flex-row gap-2 p-3 bg-muted border-t border-border">
              <Icon
                as={HourglassSimpleIcon}
                className="size-3.5 text-muted-foreground"
              />
              <Text
                selectable={false}
                className="select-none flex-1 text-xs text-muted-foreground"
              >
                A Turn is running. Changes apply from the next Turn.
              </Text>
            </View>
          )}
        </View>
      )}
    </ComposerPopover>
  );
}

export function ComposerModeControl({
  configuration,
  disabled,
}: {
  configuration: ComposerConfigurationProps;
  disabled: boolean;
}) {
  const mode = selection(configuration, 'mode');
  const current = choices(mode).find(
    (choice) => choice.value === mode?.currentValue,
  );
  if (!mode) return null;
  return (
    <ComposerPopover
      label="Mode"
      trigger={
        <Button
          variant="ghost"
          disabled={disabled}
          accessibilityLabel="Mode"
          className="h-8 sm:h-8 px-2 has-[>svg]:px-2 gap-1 wide:gap-1.5"
        >
          <Icon
            as={configurationIcon(current?._meta?.argo?.icon)}
            className={cn(
              'size-3.5 text-foreground',
              current?._meta?.argo?.tone === 'dangerous' && 'text-destructive',
            )}
          />
          <Text
            selectable={false}
            className={cn(
              'select-none',
              'hidden wide:flex text-sm font-medium',
              current?._meta?.argo?.tone === 'dangerous' && 'text-destructive',
            )}
          >
            {current?.name.replace(/\s*\(recommended\)\s*$/i, '')}
          </Text>
          <Icon
            as={CaretDownIcon}
            className="size-3 wide:size-3.5 text-muted-foreground"
          />
        </Button>
      }
    >
      {(close) => (
        <View className="py-2 wide:p-1">
          <Text
            selectable={false}
            className="select-none px-4 wide:px-2 py-2 text-lg wide:text-xs font-semibold wide:font-medium"
          >
            Mode
          </Text>
          {choices(mode).map((choice) => (
            <Choice
              key={choice.value}
              selected={choice.value === mode.currentValue}
              label={choice.name}
              description={choice.description}
              dangerous={choice._meta?.argo?.tone === 'dangerous'}
              leading={
                <Icon
                  as={configurationIcon(choice._meta?.argo?.icon)}
                  className={cn(
                    'size-5 wide:size-3.5 text-muted-foreground',
                    choice._meta?.argo?.tone === 'dangerous' &&
                      'text-destructive',
                  )}
                />
              }
              onPress={() => {
                configuration.onConfigChange(mode.configId, choice.value);
                close();
              }}
            />
          ))}
        </View>
      )}
    </ComposerPopover>
  );
}

export function ComposerCheckoutControl({
  checkout,
  disabled,
}: {
  checkout: ComposerConfigurationProps['checkout'];
  disabled: boolean;
}) {
  const [search, setSearch] = useState('');
  return (
    <View className="flex-row items-center gap-2">
      {checkout.onNewWorktreeChange && (
        <View className="flex-row gap-2 items-center">
          <Switch
            size="small"
            accessibilityLabel="New worktree"
            disabled={disabled}
            checked={checkout.newWorktree}
            onCheckedChange={checkout.onNewWorktreeChange}
          />
          <Label
            disabled={disabled}
            onPress={() =>
              checkout.onNewWorktreeChange?.(!checkout.newWorktree)
            }
            className="select-none text-xs font-medium text-muted-foreground"
          >
            New worktree
          </Label>
        </View>
      )}
      <ComposerPopover
        label={checkout.onBranchChange ? 'Base branch' : 'Checkout'}
        trigger={
          <Button
            variant="ghost"
            disabled={
              disabled || (!!checkout.onBranchChange && !checkout.newWorktree)
            }
            accessibilityLabel={
              checkout.onBranchChange ? 'Base branch' : 'Checkout'
            }
            className="h-7 sm:h-7 px-2 gap-1.5"
          >
            <Icon
              as={GitBranchIcon}
              className="size-3.5 text-muted-foreground"
            />
            <Text
              selectable={false}
              className="select-none text-xs font-mono font-normal"
            >
              {checkout.newWorktree || !checkout.onBranchChange
                ? checkout.branch === 'main'
                  ? 'Main'
                  : checkout.branch
                : 'Main'}
            </Text>
            {checkout.onBranchChange && (
              <Icon
                as={CaretDownIcon}
                className="size-2.5 text-muted-foreground"
              />
            )}
          </Button>
        }
      >
        {(close) =>
          checkout.onBranchChange ? (
            <View className="pb-2 wide:pb-1">
              <Input
                accessibilityLabel="Search branches"
                placeholder="Search branches…"
                value={search}
                onChangeText={setSearch}
                className="h-10 sm:h-10 border-0 rounded-none shadow-none px-3 web:focus-visible:ring-0 web:focus-visible:border-transparent"
              />
              <View className="wide:px-1">
                {[...checkout.branches]
                  .sort(
                    (left, right) =>
                      Number(right === checkout.currentBranch) -
                      Number(left === checkout.currentBranch),
                  )
                  .filter((branch) =>
                    branch.toLowerCase().includes(search.toLowerCase()),
                  )
                  .map((branch) => (
                    <Button
                      key={branch}
                      variant="ghost"
                      accessibilityLabel={branch}
                      aria-pressed={branch === checkout.branch}
                      accessibilityState={{
                        selected: branch === checkout.branch,
                      }}
                      className="min-h-15 wide:min-h-8 h-auto sm:h-auto px-4 wide:px-2 gap-3 wide:gap-2 justify-start rounded-none wide:rounded-sm"
                      onPress={() => {
                        checkout.onBranchChange?.(branch);
                        setSearch('');
                        close();
                      }}
                    >
                      <Icon
                        as={GitBranchIcon}
                        className="size-3.5 text-muted-foreground"
                      />
                      <Text
                        selectable={false}
                        className="select-none flex-1 text-base wide:text-xs wide:leading-4 font-mono"
                      >
                        {branch}
                      </Text>
                      {branch === checkout.currentBranch && (
                        <Text
                          selectable={false}
                          className="select-none text-xs text-muted-foreground"
                        >
                          current
                        </Text>
                      )}
                      {branch === checkout.branch && (
                        <Icon as={CheckIcon} className="size-3.5" />
                      )}
                    </Button>
                  ))}
                {!checkout.branches.some((branch) =>
                  branch.toLowerCase().includes(search.toLowerCase()),
                ) && (
                  <Text
                    selectable={false}
                    className="select-none p-4 text-sm text-muted-foreground"
                  >
                    No branches found.
                  </Text>
                )}
              </View>
            </View>
          ) : (
            <View className="p-4 gap-3">
              <Text
                selectable={false}
                className="select-none text-sm font-medium"
              >
                Checkout
              </Text>
              <Text
                selectable={false}
                className="select-none text-sm text-muted-foreground"
              >
                {checkout.path ?? checkout.branch}
              </Text>
              {checkout.onOpenFolder && (
                <Button
                  variant="ghost"
                  onPress={() => {
                    checkout.onOpenFolder?.();
                    close();
                  }}
                >
                  <Text selectable={false} className="select-none">
                    Open in Finder
                  </Text>
                </Button>
              )}
              {checkout.onOpenTerminal && (
                <Button
                  variant="ghost"
                  onPress={() => {
                    checkout.onOpenTerminal?.();
                    close();
                  }}
                >
                  <Text selectable={false} className="select-none">
                    Open in terminal
                  </Text>
                </Button>
              )}
            </View>
          )
        }
      </ComposerPopover>
    </View>
  );
}
