import { LegendList } from '@legendapp/list';
import type {
  AgentInfo,
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
  LightningIcon,
  MapTrifoldIcon,
  PencilIcon,
  ShieldCheckIcon,
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
import { Label } from '#primitives/label';
import { Switch } from '#primitives/switch';
import { Text } from '#primitives/text';
import { useWide } from '../navigation/use-wide';
import { Slider } from '../primitives/slider';
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
function configurationIcon(name?: string) {
  return (
    {
      ShieldCheck: ShieldCheckIcon,
      Pencil: PencilIcon,
      MapTrifold: MapTrifoldIcon,
      Sparkles: SparkleIcon,
      WarningTriangle: WarningIcon,
    }[name ?? ''] ?? ShieldWarningIcon
  );
}
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
    let availabilityLabel: string;
    if (agent.availability === 'not_signed_in') {
      availabilityLabel = 'Not signed in';
    } else if (agent.availability === 'not_installed') {
      availabilityLabel = 'Not installed';
    } else {
      availabilityLabel = 'Unavailable';
    }
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
            {agent.availability !== 'available' && (
              <Text
                selectable={false}
                className="select-none text-xs leading-4 text-warning"
              >
                {availabilityLabel}
              </Text>
            )}
          </View>
          {configuration.onAgentChange &&
            agent.agent === configuration.agent && <Icon as={CheckIcon} />}
        </Button>
        {agent.availability !== 'available' && configuration.onAgentSetup && (
          <Button
            variant="ghost"
            accessibilityLabel={`Set up ${agent.label}`}
            className="h-7 sm:h-7 py-0 ml-8 px-2 justify-start"
            onPress={() => configuration.onAgentSetup?.(agent.agent)}
          >
            <Text selectable={false} className="select-none text-xs">
              {agent.availability === 'not_signed_in' ? 'Sign in' : 'Install'}
            </Text>
          </Button>
        )}
      </View>
    );
  };
  const footer = !configuration.onAgentChange ? (
    <Text
      selectable={false}
      className="select-none pl-8 pr-2 pb-1 text-xs leading-4 text-muted-foreground"
    >
      Start a new Session to switch Agent
    </Text>
  ) : null;
  if (wide)
    return (
      <View className="relative flex-1 min-h-0">
        <LegendList
          testID="composer-agents-scroll"
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
            if (!choice._meta?.argo?.supportsFastMode)
              configuration.onFastModeChange?.(false);
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
  const model = selection(configuration, 'model');
  const effort = selection(configuration, 'thought_level');
  const current = choices(model).find(
    (choice) => choice.value === model?.currentValue,
  );
  const levels = current?._meta?.argo?.supportedEffortLevels;
  const effortChoices = choices(effort).filter(
    (choice) => !levels || levels.includes(choice.value),
  );
  if (
    !effort ||
    current?._meta?.argo?.supportsEffort === false ||
    !effortChoices.length
  )
    return null;
  const selectedIndex = Math.max(
    0,
    effortChoices.findIndex((choice) => choice.value === effort.currentValue),
  );
  return (
    <View className="border-t border-border px-3 pt-2.5 pb-3 gap-2.5">
      <View className="gap-0.5">
        <Text
          selectable={false}
          className="select-none text-xs leading-4 font-medium text-muted-foreground"
        >
          Effort
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
          valueLabel={effortChoices[selectedIndex]?.name ?? ''}
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
                  aria-pressed={choice.value === effort.currentValue}
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
                      choice.value === effort.currentValue && 'text-foreground',
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

function FastModeControl({
  configuration,
}: {
  configuration: ComposerConfigurationProps;
}) {
  const model = selection(configuration, 'model');
  const current = choices(model).find(
    (choice) => choice.value === model?.currentValue,
  );
  if (
    !current?._meta?.argo?.supportsFastMode ||
    !configuration.onFastModeChange
  )
    return null;
  return (
    <View className="p-1 border-t border-border">
      <View className="min-h-11 wide:min-h-8 py-1.5 px-2 flex-row items-center gap-1">
        <View className="flex-1 min-w-0 gap-0.5">
          <Label
            onPress={() =>
              configuration.onFastModeChange?.(!configuration.fastMode)
            }
            className="select-none text-sm leading-5 font-normal"
          >
            Fast mode
          </Label>
          <Text
            selectable={false}
            className="select-none text-xs leading-4 text-muted-foreground"
          >
            Quicker replies from {modelName(current)}, at a higher cost
          </Text>
        </View>
        <Switch
          size="small"
          accessibilityLabel="Fast mode"
          checked={!!configuration.fastMode}
          onCheckedChange={configuration.onFastModeChange}
        />
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
          <View className="p-1 gap-0.5 border-t border-border">
            <Button
              variant="ghost"
              accessibilityLabel="Choose Agent"
              disabled={!configuration.onAgentChange}
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
        <FastModeControl configuration={configuration} />
        <EffortControl configuration={configuration} />
        {configuration.turnRunning && (
          <View className="flex-row gap-2 px-3 py-2.5 bg-muted border-t border-border">
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
  const wide = useWide();
  const model = selection(configuration, 'model');
  const current = choices(model).find(
    (choice) => choice.value === model?.currentValue,
  );
  const effort = selection(configuration, 'thought_level');
  const effortLabel = choices(effort).find(
    (choice) => choice.value === effort?.currentValue,
  )?.name;
  const agent = configuration.agents.find(
    (entry) => entry.agent === configuration.agent,
  );
  if (!model) return null;
  return (
    <ComposerPopover
      label="Agent and model"
      width={580}
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
            {modelName(current)}
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
          {configuration.fastMode && (
            <View
              accessible
              accessibilityRole="image"
              accessibilityLabel="Fast mode enabled"
            >
              <Icon as={LightningIcon} weight="fill" />
            </View>
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
          className="h-7 sm:h-7 py-0 w-7 wide:w-auto p-0 wide:px-1.5 has-[>svg]:px-0 wide:has-[>svg]:px-1.5 gap-1.5"
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
              'hidden wide:flex text-sm leading-5 font-normal text-muted-foreground',
              current?._meta?.argo?.tone === 'dangerous' && 'text-destructive',
            )}
          >
            {current?.name.replace(/\s*\(recommended\)\s*$/i, '')}
          </Text>
          <View className="hidden wide:flex -ml-0.5">
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
  const wide = useWide();
  const created = !!checkout.path;
  const editable = !created && !!checkout.onNewWorktreeChange;
  if (created || !editable)
    return (
      <View className="h-7 max-w-full wide:max-w-96 min-w-0 px-1.5 flex-row items-center gap-1.5">
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
