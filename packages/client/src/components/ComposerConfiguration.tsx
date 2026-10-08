import { LegendList } from '@legendapp/list/react-native';
import type {
  AgentAvailability,
  AgentInfo,
  ConfigOptionIcon,
  SessionConfigOption,
  SessionConfigSelectOption,
} from '@repo/contracts';
import {
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CheckIcon,
  FolderIcon,
  GitBranchIcon,
  HourglassSimpleIcon,
  MapTrifoldIcon,
  PencilIcon,
  ShieldWarningIcon,
  SparkleIcon,
  WarningIcon,
} from 'phosphor-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { withUniwind } from 'uniwind';
import { cn } from '#lib/utils';
import { Button } from '#primitives/button';
import { Text } from '#primitives/text';
import { listTestIdProps } from '../lib/list-test-id';
import { useWide } from '../navigation/use-wide';
import { Slider } from '../primitives/slider';
import { ComposerPopover } from './ComposerPopover';
import { useContentWide } from './ContentLayout';
import { Icon } from './Icon';

type SelectConfiguration = Extract<SessionConfigOption, { type: 'select' }>;
export interface ComposerConfigurationProps {
  agents: AgentInfo[];
  agent: string;
  configOptions: SessionConfigOption[];
  onConfigChange: (configId: string, value: string | boolean) => void;
  onAgentChange?: (agent: string) => void;
  onAgentSetup?: (agent: string) => void;
  onAgentRetry?: () => void;
  turnRunning?: boolean;
  checkout: {
    branch: string;
    newWorktree: boolean;
    onNewWorktreeChange?: (enabled: boolean) => void;
    path?: string;
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
function currentEffort(configuration: ComposerConfigurationProps) {
  const model = selection(configuration, 'model');
  const option = selection(configuration, 'thought_level');
  const currentModel = choices(model).find(
    (choice) => choice.value === model?.currentValue,
  );
  const levels = currentModel?._meta?.argo?.supportedEffortLevels;
  const effortChoices =
    currentModel?._meta?.argo?.supportsEffort === false
      ? []
      : choices(option).filter(
          (choice) => !levels || levels.includes(choice.value),
        );
  return {
    option,
    choices: effortChoices,
    selected: effortChoices.find(
      (choice) => choice.value === option?.currentValue,
    ),
  };
}

const configurationIcons: Record<string, typeof ShieldWarningIcon> = {
  ShieldWarning: ShieldWarningIcon,
  Pencil: PencilIcon,
  MapTrifold: MapTrifoldIcon,
  Sparkles: SparkleIcon,
  WarningTriangle: WarningIcon,
} satisfies Record<ConfigOptionIcon, typeof ShieldWarningIcon>;
const agentModelMenuWidth = 580;
const agentMenuWidth = 280;
function configurationIcon(name?: string) {
  return (
    (name && Object.hasOwn(configurationIcons, name)
      ? configurationIcons[name]
      : undefined) ?? ShieldWarningIcon
  );
}
const agentAvailability = {
  not_signed_in: {
    label: 'Not signed in',
    button: 'Sign in',
    action: 'setup',
    reason: false,
  },
  not_installed: {
    label: 'Not installed',
    button: 'Install',
    action: 'setup',
    reason: false,
  },
  unavailable: {
    label: 'Unavailable',
    button: 'Retry',
    action: 'retry',
    reason: true,
  },
} satisfies Record<
  Exclude<AgentAvailability, 'available'>,
  { label: string; button: string; action: 'setup' | 'retry'; reason: boolean }
>;
const ThemedLogo = withUniwind(SvgXml, {
  color: { fromClassName: 'className', styleProperty: 'color' },
});

function Logo({ agent }: { agent?: AgentInfo }) {
  return agent ? (
    <View className="size-icon-md shrink-0 items-center justify-center">
      <View testID="composer-agent-icon" className="size-icon-mark">
        <ThemedLogo
          xml={agent.logo}
          className="text-foreground"
          width="100%"
          height="100%"
        />
      </View>
    </View>
  ) : null;
}
function Choice({
  selected,
  label,
  description,
  onPress,
  dangerous = false,
  leading,
  accessibilityLabel,
}: {
  selected: boolean;
  label: string;
  accessibilityLabel?: string;
  description?: string;
  onPress: () => void;
  dangerous?: boolean;
  leading?: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      aria-pressed={selected}
      onPress={onPress}
      className={cn(
        'min-h-11 wide:min-h-8 h-auto sm:h-auto justify-start gap-2.5 px-2 py-1.5 rounded-sm',
        'web:focus-visible:ring-0 web:focus-visible:bg-accent',
        selected && 'bg-accent',
        description && 'min-h-13 wide:min-h-0',
        leading && 'items-start py-2',
      )}
    >
      {leading && (
        <View className="h-5 w-4 shrink-0 items-center justify-center">
          {leading}
        </View>
      )}
      <View className={cn('flex-1 min-w-0 gap-0.5', leading && 'gap-0')}>
        <Text
          selectable={false}
          className={cn(
            'select-none',
            'text-sm leading-5 font-normal',
            dangerous && 'text-destructive',
          )}
        >
          {label}
        </Text>
        {description && (
          <Text
            selectable={false}
            className="select-none text-xs leading-4 font-normal text-muted-foreground"
          >
            {description}
          </Text>
        )}
      </View>
      <View
        className={cn(
          'size-icon-md items-center justify-center',
          leading && 'h-5',
        )}
      >
        {selected && <Icon as={CheckIcon} />}
      </View>
    </Button>
  );
}

function modelName(choice?: SessionConfigSelectOption) {
  return (
    choice?._meta?.argo?.shortName ??
    choice?.name.replace(/\s*\(recommended\)\s*$/i, '') ??
    ''
  );
}

function MenuHeading({ children }: { children: string }) {
  return (
    <Text
      selectable={false}
      className="select-none px-2 py-1 text-xs leading-4 font-medium text-muted-foreground"
    >
      {children}
    </Text>
  );
}

function AgentChoices({
  configuration,
  onSelect,
}: {
  configuration: ComposerConfigurationProps;
  onSelect: () => void;
}) {
  const wide = useWide();
  const agents = configuration.onAgentChange
    ? configuration.agents
    : configuration.agents.filter(
        (agent) => agent.agent === configuration.agent,
      );
  const renderAgent = (agent: AgentInfo) => {
    const availability =
      agent.availability === 'available'
        ? undefined
        : agentAvailability[agent.availability];
    const setup = configuration.onAgentSetup
      ? () => configuration.onAgentSetup?.(agent.agent)
      : undefined;
    const onAvailabilityAction =
      availability?.action === 'retry' ? configuration.onAgentRetry : setup;
    return (
      <View key={agent.agent}>
        <Button
          variant="ghost"
          accessibilityLabel={`Select ${agent.label}`}
          disabled={
            !configuration.onAgentChange || agent.availability !== 'available'
          }
          accessibilityState={{
            selected: agent.agent === configuration.agent,
          }}
          aria-pressed={agent.agent === configuration.agent}
          className={cn(
            'min-h-11 wide:min-h-8 h-auto sm:h-auto py-1.5 px-2 has-[>svg]:px-2 rounded-sm justify-start gap-2.5 wide:gap-2 web:focus-visible:ring-0 web:focus-visible:bg-accent',
            configuration.onAgentChange &&
              agent.agent === configuration.agent &&
              'bg-accent',
          )}
          onPress={() => {
            if (agent.agent !== configuration.agent)
              configuration.onAgentChange?.(agent.agent);
            onSelect();
          }}
        >
          {wide && <Logo agent={agent} />}
          <View className="flex-1 min-w-0 gap-0.5">
            <Text
              selectable={false}
              className="select-none text-sm leading-5 font-normal"
            >
              {agent.label}
            </Text>
            {availability && (
              <Text
                selectable={false}
                className={cn(
                  'select-none text-xs leading-4',
                  availability.reason
                    ? 'text-muted-foreground'
                    : 'text-warning',
                )}
              >
                {availability.label}
              </Text>
            )}
            {availability?.reason && agent.installStep && (
              <Text
                selectable={false}
                className="select-none text-xs leading-4 text-muted-foreground"
              >
                {agent.installStep}
              </Text>
            )}
          </View>
          {configuration.onAgentChange &&
            agent.agent === configuration.agent && <Icon as={CheckIcon} />}
        </Button>
        {availability && onAvailabilityAction && (
          <Button
            variant="ghost"
            accessibilityLabel={`${availability.action === 'retry' ? 'Retry' : 'Set up'} ${agent.label}`}
            className="h-7 sm:h-7 py-0 ml-8 px-2 justify-start"
            onPress={onAvailabilityAction}
          >
            <Text
              selectable={false}
              className={cn(
                'select-none text-xs',
                availability.action === 'retry' && 'underline',
              )}
            >
              {availability.button}
            </Text>
          </Button>
        )}
      </View>
    );
  };
  // In a View, since bare Text in a list footer is inline on web and pads only its first line.
  const footer = configuration.onAgentChange ? null : (
    <View className="pl-8 pr-2 pb-1">
      <Text
        selectable={false}
        className="select-none text-xs leading-4 text-muted-foreground"
      >
        Start a new Session to switch Agent
      </Text>
    </View>
  );
  if (wide)
    return (
      <View className="relative flex-1 min-h-0">
        <LegendList
          {...listTestIdProps('composer-agents-scroll')}
          style={{ position: 'absolute', inset: 0 }}
          contentContainerStyle={{
            paddingHorizontal: 4,
            paddingTop: 2,
            paddingBottom: 4,
          }}
          data={agents}
          keyExtractor={(agent) => agent.agent}
          renderItem={({ item }) => renderAgent(item)}
          estimatedItemSize={34}
          ItemSeparatorComponent={AgentSeparator}
          ListFooterComponent={footer}
          extraData={configuration}
          recycleItems={false}
          keyboardShouldPersistTaps="handled"
        />
      </View>
    );
  return (
    <View className="p-1 gap-0.5">
      {agents.map(renderAgent)}
      {footer}
    </View>
  );
}

function AgentSeparator() {
  return <View className="h-0.5" />;
}

function ModelChoices({
  configuration,
  onSelect,
}: {
  configuration: ComposerConfigurationProps;
  onSelect: () => void;
}) {
  const model = selection(configuration, 'model');
  if (!model) return null;
  return (
    <View className="p-1 wide:pt-0.5 gap-0.5">
      {choices(model).map((choice) => (
        <Choice
          key={choice.value}
          selected={choice.value === model.currentValue}
          label={modelName(choice)}
          accessibilityLabel={choice.name}
          description={choice.description}
          onPress={() => {
            configuration.onConfigChange(model.configId, choice.value);
            onSelect();
          }}
        />
      ))}
    </View>
  );
}

function EffortControl({
  configuration,
}: {
  configuration: ComposerConfigurationProps;
}) {
  const {
    option: effort,
    choices: effortChoices,
    selected,
  } = currentEffort(configuration);
  if (!effort || !effortChoices.length) return null;
  const selectedIndex = selected ? effortChoices.indexOf(selected) : undefined;
  return (
    <View className="px-3 pt-2.5 pb-3 gap-2.5">
      <View className="gap-0.5">
        <Text
          selectable={false}
          className="select-none text-xs leading-4 font-medium text-muted-foreground"
        >
          {selected ? 'Effort' : 'No selection'}
        </Text>
        <Text
          selectable={false}
          className="select-none text-xs leading-4 text-muted-foreground"
        >
          More effort trades speed for deeper reasoning.
        </Text>
      </View>
      <View className="gap-1.5">
        <Slider
          accessibilityLabel="Effort"
          valueLabel={selected?.name ?? 'No selection'}
          minimumValue={0}
          maximumValue={Math.max(1, effortChoices.length - 1)}
          step={1}
          value={selectedIndex}
          onValueChange={(index) => {
            const choice = effortChoices[Math.round(index)];
            if (choice)
              configuration.onConfigChange(effort.configId, choice.value);
          }}
        />
        <View className="flex-row justify-between px-1.5">
          {effortChoices.map((choice, index) => {
            let effortAlignment: string;
            if (index === 0) {
              effortAlignment = 'items-start';
            } else if (index === effortChoices.length - 1) {
              effortAlignment = 'items-end';
            } else {
              effortAlignment = 'items-center';
            }
            return (
              <View
                key={choice.value}
                className={cn('w-1 overflow-visible', effortAlignment)}
              >
                <Button
                  variant="ghost"
                  accessibilityLabel={`Set effort to ${choice.name}`}
                  aria-pressed={choice === selected}
                  onPress={() =>
                    configuration.onConfigChange(effort.configId, choice.value)
                  }
                  className={cn(
                    'h-4 sm:h-4 native:w-16 px-0 py-0 active:bg-transparent hover:bg-transparent dark:hover:bg-transparent',
                    index === 0 && '-ml-1.5 justify-start',
                    index === effortChoices.length - 1 && '-mr-1.5 justify-end',
                  )}
                >
                  <Text
                    selectable={false}
                    numberOfLines={1}
                    className={cn(
                      'select-none text-xs leading-4 font-normal text-muted-foreground',
                      choice === selected && 'text-foreground',
                    )}
                  >
                    {choice.name}
                  </Text>
                </Button>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function AgentModelMenu({
  configuration,
}: {
  configuration: ComposerConfigurationProps;
}) {
  const wide = useWide();
  const [page, setPage] = useState<'settings' | 'agent' | 'model'>('settings');
  const agent = configuration.agents.find(
    (entry) => entry.agent === configuration.agent,
  );
  const model = selection(configuration, 'model');
  const current = choices(model).find(
    (choice) => choice.value === model?.currentValue,
  );
  if (wide && !model)
    return (
      <View className="h-60 p-1">
        <MenuHeading>Agent</MenuHeading>
        <AgentChoices configuration={configuration} onSelect={() => {}} />
      </View>
    );
  if (!wide && page !== 'settings')
    return (
      <View>
        <View className="h-11 px-1 flex-row items-center">
          <Button
            variant="ghost"
            size="icon"
            accessibilityLabel="Back to Agent and model"
            className="size-11 sm:size-11"
            onPress={() => setPage('settings')}
          >
            <Icon size="lg" as={CaretLeftIcon} className="text-foreground" />
          </Button>
          <Text
            selectable={false}
            className="select-none flex-1 text-center text-sm leading-5 font-medium"
          >
            {page === 'agent' ? 'Agent' : 'Model'}
          </Text>
          <View className="size-11" />
        </View>
        {page === 'agent' ? (
          <AgentChoices
            configuration={configuration}
            onSelect={() => setPage('settings')}
          />
        ) : (
          <ModelChoices
            configuration={configuration}
            onSelect={() => setPage('settings')}
          />
        )}
      </View>
    );
  return (
    <View className="wide:flex-row">
      {wide && (
        <View className="w-43 shrink-0 min-h-0 bg-sidebar">
          <View className="px-1 pt-1">
            <MenuHeading>Agent</MenuHeading>
          </View>
          <AgentChoices configuration={configuration} onSelect={() => {}} />
        </View>
      )}
      <View className="wide:flex-1 min-w-0">
        {wide ? (
          <>
            <View className="px-1 pt-1">
              <MenuHeading>Model</MenuHeading>
            </View>
            <ModelChoices configuration={configuration} onSelect={() => {}} />
          </>
        ) : (
          <View className="p-1 gap-0.5">
            <Button
              variant="ghost"
              accessibilityLabel="Choose Agent"
              disabled={
                !configuration.onAgentChange &&
                agent?.availability === 'available'
              }
              onPress={() => setPage('agent')}
              className="h-11 sm:h-11 px-2 gap-2 justify-start"
            >
              <Text
                selectable={false}
                className="select-none flex-1 text-sm font-normal"
              >
                Agent
              </Text>
              <Logo agent={agent} />
              <Text
                selectable={false}
                className="select-none text-sm font-normal text-muted-foreground"
              >
                {agent?.label}
              </Text>
              {configuration.onAgentChange && (
                <Icon
                  size="sm"
                  as={CaretRightIcon}
                  className="-ml-0.5 text-muted-foreground"
                />
              )}
            </Button>
            {!configuration.onAgentChange && (
              <Text
                selectable={false}
                className="select-none text-xs leading-4 text-muted-foreground px-2 pb-1"
              >
                Start a new Session to switch Agent
              </Text>
            )}
            <Button
              variant="ghost"
              accessibilityLabel="Choose model"
              onPress={() => setPage('model')}
              className="h-11 sm:h-11 px-2 gap-2 justify-start"
            >
              <Text
                selectable={false}
                className="select-none flex-1 text-sm font-normal"
              >
                Model
              </Text>
              <Text
                selectable={false}
                className="select-none text-sm font-normal text-muted-foreground"
              >
                {modelName(current)}
              </Text>
              <Icon
                size="sm"
                as={CaretRightIcon}
                className="-ml-0.5 text-muted-foreground"
              />
            </Button>
          </View>
        )}
        <EffortControl configuration={configuration} />
        {configuration.turnRunning && (
          <View className="flex-row gap-2 px-3 py-2.5 bg-muted">
            <Icon as={HourglassSimpleIcon} className="text-muted-foreground" />
            <Text
              selectable={false}
              className="select-none flex-1 text-xs leading-4 text-muted-foreground"
            >
              A Turn is running. Changes apply from the next Turn.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export function ComposerAgentModelControl({
  configuration,
  disabled,
}: {
  configuration: ComposerConfigurationProps;
  disabled: boolean;
}) {
  const wide = useContentWide();
  const model = selection(configuration, 'model');
  const current = choices(model).find(
    (choice) => choice.value === model?.currentValue,
  );
  const effortLabel = currentEffort(configuration).selected?.name;
  const agent = configuration.agents.find(
    (entry) => entry.agent === configuration.agent,
  );
  if (!model && !agent) return null;
  return (
    <ComposerPopover
      label="Agent and model"
      width={model ? agentModelMenuWidth : agentMenuWidth}
      className="shrink min-w-0"
      trigger={
        <Button
          variant="ghost"
          disabled={disabled}
          accessibilityLabel="Agent and model"
          className="h-7 sm:h-7 py-0 px-1.5 has-[>svg]:px-1.5 gap-1.5 shrink min-w-0"
        >
          {wide && <Logo agent={agent} />}
          <Text
            selectable={false}
            numberOfLines={1}
            className={cn(
              'select-none text-sm leading-5 font-normal min-w-0 shrink',
            )}
          >
            {modelName(current) || agent?.label}
          </Text>
          {wide &&
            current?._meta?.argo?.supportsEffort !== false &&
            effortLabel && (
              <Text
                selectable={false}
                className={cn(
                  'select-none text-sm leading-5 font-normal text-muted-foreground shrink-0',
                )}
                numberOfLines={1}
              >
                {effortLabel}
              </Text>
            )}
          {wide && (
            <Icon
              size="sm"
              as={CaretDownIcon}
              className="-ml-0.5 text-muted-foreground"
            />
          )}
        </Button>
      }
    >
      {() => <AgentModelMenu configuration={configuration} />}
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
  const wide = useContentWide();
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
          className={cn(
            'h-7 sm:h-7 py-0 gap-1.5',
            wide
              ? 'w-auto px-1.5 has-[>svg]:px-1.5'
              : 'w-7 p-0 has-[>svg]:px-0',
          )}
        >
          <Icon
            as={configurationIcon(current?._meta?.argo?.icon)}
            className={cn(
              'text-muted-foreground',
              current?._meta?.argo?.tone === 'dangerous' && 'text-destructive',
            )}
          />
          <Text
            selectable={false}
            className={cn(
              'select-none',
              'text-sm leading-5 font-normal text-muted-foreground',
              !wide && 'hidden',
              current?._meta?.argo?.tone === 'dangerous' && 'text-destructive',
            )}
          >
            {current?.name.replace(/\s*\(recommended\)\s*$/i, '')}
          </Text>
          <View className={cn('-ml-0.5', !wide && 'hidden')}>
            <Icon
              size="sm"
              as={CaretDownIcon}
              className="text-muted-foreground"
            />
          </View>
        </Button>
      }
    >
      {(close) => (
        <View className="p-1 gap-0.5">
          <Text
            selectable={false}
            className="select-none px-2 pt-1.5 pb-1 text-xs leading-4 font-medium text-muted-foreground"
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
                    'text-foreground',
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

export function CheckoutContents({
  checkout,
  disabled,
  close,
}: {
  checkout: ComposerConfigurationProps['checkout'];
  disabled: boolean;
  close: () => void;
}) {
  return (
    <View className="p-1 gap-0.5">
      {[false, true].map((newWorktree) => (
        <Choice
          key={String(newWorktree)}
          label={newWorktree ? 'New worktree' : 'Local'}
          selected={checkout.newWorktree === newWorktree}
          leading={
            <Icon
              as={newWorktree ? GitBranchIcon : FolderIcon}
              className="text-muted-foreground"
            />
          }
          onPress={() => {
            if (disabled) return;
            checkout.onNewWorktreeChange?.(newWorktree);
            close();
          }}
        />
      ))}
    </View>
  );
}

export function ComposerCheckoutControl({
  checkout,
  disabled,
}: {
  checkout: ComposerConfigurationProps['checkout'];
  disabled: boolean;
}) {
  const wide = useContentWide();
  const created = !!checkout.path;
  const editable = !created && !!checkout.onNewWorktreeChange;
  if (created || !editable)
    return (
      <View
        className={cn(
          'h-7 min-w-0 px-1.5 flex-row items-center gap-1.5',
          wide ? 'max-w-96' : 'max-w-full',
        )}
      >
        <Icon
          as={checkout.newWorktree ? GitBranchIcon : FolderIcon}
          className="text-muted-foreground"
        />
        <Text
          selectable={false}
          numberOfLines={1}
          className="select-none min-w-0 shrink text-xs leading-4 font-normal font-mono"
        >
          {checkout.newWorktree
            ? checkout.path
                ?.replace(/[\\/]+$/, '')
                .split(/[\\/]/)
                .pop() || checkout.branch.toLowerCase()
            : 'Local'}
        </Text>
      </View>
    );
  return (
    <ComposerPopover
      label="Checkout"
      trigger={
        <Button
          variant="ghost"
          disabled={disabled}
          accessibilityLabel="Checkout"
          className={cn(
            'h-6 sm:h-6 py-0 px-2.5 has-[>svg]:px-2.5 gap-1.5 rounded-full border border-border bg-card',
            wide
              ? 'h-7 sm:h-7 px-1.5 has-[>svg]:px-1.5 pr-0.25 has-[>svg]:pr-0.25 rounded-md border-0 bg-transparent shadow-none'
              : 'shadow-composer',
          )}
        >
          <Icon
            as={checkout.newWorktree ? GitBranchIcon : FolderIcon}
            className="text-muted-foreground"
          />
          <Text
            selectable={false}
            className="select-none text-xs leading-4 font-normal text-muted-foreground"
          >
            {checkout.newWorktree ? 'New worktree' : 'Local'}
          </Text>
          {wide && (
            <Icon
              size="sm"
              as={CaretDownIcon}
              className="text-muted-foreground"
            />
          )}
        </Button>
      }
    >
      {(close) => (
        <CheckoutContents
          checkout={checkout}
          disabled={disabled}
          close={close}
        />
      )}
    </ComposerPopover>
  );
}
