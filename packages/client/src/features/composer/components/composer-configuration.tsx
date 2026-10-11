import type {
  AgentAvailability,
  AgentInfo,
  ConfigOptionIcon,
  SessionConfigOption,
  SessionConfigSelectOption,
} from '@repo/contracts';
import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { withUniwind } from 'uniwind';
import { listTestIdProps } from '#lib/generic/list-test-id';
import { Text } from '#lib/generic/primitives/text';
import type { IconName } from '#lib/generic/symbols/icon-names';
import { cn } from '#lib/generic/utils';
import { useContentWide } from '#lib/product/content-layout';
import { Button } from '../../../lib/generic/primitives/button';
import { FieldGroup } from '../../../lib/generic/primitives/hosted-field-group';
import { IconButton } from '../../../lib/generic/primitives/icon-button';
import { InfoPopover } from '../../../lib/generic/primitives/info-popover';
import { contentActionClass } from '../../../lib/generic/primitives/pressable';
import { Slider } from '../../../lib/generic/primitives/slider';
import { Switch } from '../../../lib/generic/primitives/switch';
import { Icon, iconSizeStyle } from '../../../lib/generic/symbols/icon';
import { useWide } from '../../../lib/generic/use-wide';
import {
  configurationChoices,
  configurationEffortChoices,
} from '../state/configuration-choices';
import {
  publishAgentModelConfiguration,
  useNativeSheets,
} from './agent-model-sheet-context';
import { ComposerPopover } from './composer-popover';
import { ScrollFadeList } from './scroll-fade-list';

const destructiveTextClassName = 'text-destructive';
const unselectableTextClassName = 'select-none';
// The trigger marks Fast mode with a bolt while it is on.
const fastModeConfigId = 'fast';
const effortDescription = 'More effort trades speed for deeper reasoning.';

type SelectConfiguration = Extract<SessionConfigOption, { type: 'select' }>;
type BooleanConfiguration = Extract<SessionConfigOption, { type: 'boolean' }>;
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

function switches(
  configuration: ComposerConfigurationProps,
): BooleanConfiguration[] {
  return configuration.configOptions.filter(
    (option): option is BooleanConfiguration => option.type === 'boolean',
  );
}
function selection(
  configuration: ComposerConfigurationProps,
  category: string,
): SelectConfiguration | undefined {
  return configuration.configOptions.find(
    (option): option is SelectConfiguration =>
      option.type === 'select' && option.category === category,
  );
}
function currentEffort(configuration: ComposerConfigurationProps): {
  option: ReturnType<typeof selection>;
  choices: SessionConfigSelectOption[];
  selected: SessionConfigSelectOption | undefined;
  // True when the Agent's value is not a level this model offers, so selected is the fallback.
  fallback: boolean;
} {
  const model = selection(configuration, 'model');
  const option = selection(configuration, 'thought_level');
  const effortChoices = configurationEffortChoices(model, option);
  const current = effortChoices.find(
    (choice) => choice.value === option?.currentValue,
  );
  return {
    option,
    choices: effortChoices,
    selected:
      current ??
      fallbackEffort(configurationChoices(option), effortChoices, option),
    fallback: !current && effortChoices.length > 0,
  };
}

// Effort always has a level: the highest offered level at or below the Agent's value, else the middle one.
function fallbackEffort(
  all: SessionConfigSelectOption[],
  offered: SessionConfigSelectOption[],
  option: ReturnType<typeof selection>,
): SessionConfigSelectOption | undefined {
  const rank = all.findIndex((choice) => choice.value === option?.currentValue);
  const below =
    rank < 0
      ? []
      : offered.filter(
          (choice) => all.findIndex((c) => c.value === choice.value) < rank,
        );
  return below.at(-1) ?? offered[Math.floor(offered.length / 2)];
}

const configurationIcons: Record<string, IconName> = {
  ShieldWarning: 'permission',
  Pencil: 'edit',
  MapTrifold: 'plan-mode',
  Sparkles: 'sparkle',
  WarningTriangle: 'warning',
} satisfies Record<ConfigOptionIcon, IconName>;
const agentModelMenuWidth = 580;
const agentMenuWidth = 280;
const modelListMaxHeight = 320;
function configurationIcon(name?: string): IconName {
  return (
    (name && Object.hasOwn(configurationIcons, name)
      ? configurationIcons[name]
      : undefined) ?? 'permission'
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

function Logo({ agent }: { agent?: AgentInfo }): React.JSX.Element | null {
  return agent ? (
    <View
      style={iconSizeStyle('sm')}
      className="shrink-0 items-center justify-center"
    >
      <View testID="composer-agent-icon" style={iconSizeStyle('sm')}>
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
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      aria-pressed={selected}
      onPress={onPress}
      role="button"
      className={contentActionClass({
        variant: 'ghost',
        className: cn(
          'min-h-11 wide:min-h-8 h-auto sm:h-auto justify-start gap-2.5 px-2.5 wide:px-2 py-1.5 rounded-sm',
          'web:focus-visible:ring-0 web:focus-visible:bg-accent',
          selected && 'bg-accent ios:bg-accent/50',
          description && 'min-h-13 wide:min-h-0',
          leading && 'items-start py-2',
        ),
      })}
    >
      {leading && (
        <View className="h-5 w-4 shrink-0 items-center justify-center">
          {leading}
        </View>
      )}
      <View className={cn('flex-1 min-w-0 gap-0.5', leading && 'gap-0')}>
        <Text
          selectable={false}
          role="body"
          className={cn(
            unselectableTextClassName,
            dangerous && destructiveTextClassName,
          )}
        >
          {label}
        </Text>
        {description && (
          <Text selectable={false} role="secondary" className="select-none">
            {description}
          </Text>
        )}
      </View>
      <View
        className="items-center justify-center"
        style={[
          iconSizeStyle('sm'),
          !!leading && { height: iconSizeStyle('md').height },
        ]}
      >
        {selected && <Icon name="check" />}
      </View>
    </Pressable>
  );
}

function modelName(choice?: SessionConfigSelectOption): string {
  return (
    choice?._meta?.argo?.shortName ??
    choice?.name.replace(/\s*\(recommended\)\s*$/i, '') ??
    ''
  );
}

// The heading's text starts where the rows' text does; padding on web Text is inline, so a View carries it.
function MenuHeading({ children }: { children: string }): React.JSX.Element {
  return (
    <View className="px-1.5 wide:px-1 py-1">
      <MenuHeadingText>{children}</MenuHeadingText>
    </View>
  );
}

function MenuHeadingText({
  children,
}: {
  children: string;
}): React.JSX.Element {
  return (
    <Text
      selectable={false}
      role="badge"
      className="select-none text-muted-foreground"
    >
      {children}
    </Text>
  );
}

export function AgentChoices({
  configuration,
  onSelect,
}: {
  configuration: ComposerConfigurationProps;
  onSelect: () => void;
}): React.JSX.Element {
  const wide = useWide();
  // A running Session keeps its Agent: the list stays, disabled, with that Agent chosen.
  const agents = configuration.agents;
  const renderAgent = (agent: AgentInfo): React.JSX.Element => {
    const availability =
      agent.availability === 'available'
        ? undefined
        : agentAvailability[agent.availability];
    const setup = configuration.onAgentSetup
      ? (): void | undefined => configuration.onAgentSetup?.(agent.agent)
      : undefined;
    const onAvailabilityAction =
      availability?.action === 'retry' ? configuration.onAgentRetry : setup;
    return (
      <View key={agent.agent}>
        <Pressable
          accessibilityLabel={`Select ${agent.label}`}
          disabled={
            !configuration.onAgentChange || agent.availability !== 'available'
          }
          accessibilityState={{
            selected: agent.agent === configuration.agent,
          }}
          aria-pressed={agent.agent === configuration.agent}
          onPress={() => {
            if (agent.agent !== configuration.agent)
              configuration.onAgentChange?.(agent.agent);
            onSelect();
          }}
          role="button"
          className={contentActionClass({
            variant: 'ghost',
            className: cn(
              'min-h-11 wide:min-h-8 h-auto sm:h-auto py-1.5 px-2.5 has-[>[data-icon]]:px-2.5 wide:px-2 wide:has-[>[data-icon]]:px-2 rounded-sm justify-start gap-2.5 wide:gap-2 web:focus-visible:ring-0 web:focus-visible:bg-accent',
              // The desktop pane sits on the sidebar colour, so its chosen row needs a deeper fill; a running Session dims only the Agents it cannot switch to.
              agent.agent === configuration.agent &&
                'bg-accent ios:bg-accent/50 wide:bg-foreground/7 opacity-100 disabled:opacity-100',
            ),
            disabled:
              !configuration.onAgentChange ||
              agent.availability !== 'available',
          })}
        >
          {wide && <Logo agent={agent} />}
          <View className="flex-1 min-w-0 gap-0.5">
            <Text selectable={false} role="body" className="select-none">
              {agent.label}
            </Text>
            {availability && (
              <Text
                selectable={false}
                role="secondary"
                className={cn(
                  unselectableTextClassName,
                  !availability.reason && 'text-warning',
                )}
              >
                {availability.label}
              </Text>
            )}
            {availability?.reason && agent.installStep && (
              <Text selectable={false} role="secondary" className="select-none">
                {agent.installStep}
              </Text>
            )}
          </View>
          {agent.agent === configuration.agent && <Icon name="check" />}
        </Pressable>
        {availability && onAvailabilityAction && (
          <Button
            variant="ghost"
            accessibilityLabel={`${availability.action === 'retry' ? 'Retry' : 'Set up'} ${agent.label}`}
            className="web:sm:min-h-0 h-7 sm:h-7 py-0 ml-8 px-2 justify-start"
            onPress={onAvailabilityAction}
            label={availability.button}
            appearance="content"
            labelClassName={cn(
              'select-none type-control',
              availability.action === 'retry' && 'underline',
            )}
          />
        )}
      </View>
    );
  };

  const currentIndex = agents.findIndex(
    (agent) => agent.agent === configuration.agent,
  );
  if (wide)
    return (
      <ScrollFadeList
        {...listTestIdProps('composer-agents-scroll')}
        surfaceClassName="bg-sidebar"
        contentContainerStyle={{
          paddingHorizontal: 4,
          paddingTop: 2,
          paddingBottom: 4,
        }}
        data={agents}
        initialScrollIndex={currentIndex > 0 ? currentIndex : undefined}
        keyExtractor={(agent) => agent.agent}
        renderItem={({ item }) => renderAgent(item)}
        estimatedItemSize={34}
        ItemSeparatorComponent={ChoiceSeparator}
        extraData={configuration}
      />
    );
  return (
    <View className="px-gutter-list py-1 wide:p-1 gap-0.5">
      {agents.map(renderAgent)}
    </View>
  );
}

function ChoiceSeparator(): React.JSX.Element {
  return <View className="h-0.5" />;
}

export function ModelChoices({
  configuration,
  onSelect,
}: {
  configuration: ComposerConfigurationProps;
  onSelect: () => void;
}): React.JSX.Element | null {
  const model = selection(configuration, 'model');
  if (!model) return null;
  return (
    <View className="px-gutter-list py-1 wide:p-1 wide:pt-0.5 gap-0.5">
      {configurationChoices(model).map((choice) => (
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

// The desktop model list grows with its models up to a cap, then scrolls.
function ModelList({
  configuration,
}: {
  configuration: ComposerConfigurationProps;
}): React.JSX.Element | null {
  const model = selection(configuration, 'model');
  if (!model) return null;
  return (
    <ScrollFadeList
      {...listTestIdProps('composer-models-scroll')}
      surfaceClassName="bg-popover"
      maxHeight={modelListMaxHeight}
      contentContainerStyle={{
        paddingHorizontal: 4,
        paddingTop: 2,
        paddingBottom: 4,
      }}
      data={configurationChoices(model)}
      keyExtractor={(choice) => choice.value}
      renderItem={({ item: choice }) => (
        <Choice
          selected={choice.value === model.currentValue}
          label={modelName(choice)}
          accessibilityLabel={choice.name}
          description={choice.description}
          onPress={() =>
            configuration.onConfigChange(model.configId, choice.value)
          }
        />
      )}
      estimatedItemSize={40}
      ItemSeparatorComponent={ChoiceSeparator}
      extraData={configuration}
    />
  );
}

function EffortControl({
  configuration,
}: {
  configuration: ComposerConfigurationProps;
}): React.JSX.Element | null {
  const {
    option: effort,
    choices: effortChoices,
    selected,
  } = currentEffort(configuration);
  const wide = useWide();
  if (!effort || !effortChoices.length || !selected) return null;
  const selectedIndex = effortChoices.indexOf(selected);
  const levelLabel = selected.name;
  const onSliderChange = (index: number): void => {
    const choice = effortChoices[Math.round(index)];
    if (choice) configuration.onConfigChange(effort.configId, choice.value);
  };
  const slider = (
    <Slider
      accessibilityLabel="Effort"
      valueLabel={levelLabel}
      minimumValue={0}
      maximumValue={Math.max(1, effortChoices.length - 1)}
      step={1}
      value={selectedIndex}
      onValueChange={onSliderChange}
    />
  );
  const ends = (
    <View className="flex-row justify-between">
      <Text selectable={false} role="secondary" className="select-none">
        Fastest
      </Text>
      <Text selectable={false} role="secondary" className="select-none">
        Smartest
      </Text>
    </View>
  );
  // Outside the wide menu, Effort is a row like Agent and Model, with the level on the right.
  if (!wide)
    return (
      // The same insets as the Agent and Model rows, so the labels line up.
      <View className="px-gutter-list native:px-0 pb-3">
        <View className="px-2.5 web:px-3 native:px-0 gap-1.5">
          <View className="h-11 flex-row items-center gap-2">
            <Text selectable={false} role="body" className="select-none">
              Effort
            </Text>
            {/* The margin sits the icon 6px after the label. */}
            <View className="-ml-2">
              <InfoPopover
                accessibilityLabel="About effort"
                text={effortDescription}
              />
            </View>
            <View className="flex-1" />
            <Text
              selectable={false}
              role="body"
              className="select-none text-muted-foreground"
            >
              {selected.name}
            </Text>
          </View>
          {slider}
          {ends}
        </View>
      </View>
    );
  return (
    <View className="px-2 pt-2.5 pb-3 gap-2.5">
      <View className="gap-0.5">
        <View className="flex-row items-center gap-2">
          <MenuHeadingText>Effort</MenuHeadingText>
          <View className="flex-1" />
          <Text selectable={false} role="secondary" className="select-none">
            {selected.name}
          </Text>
        </View>
        <Text selectable={false} role="secondary" className="select-none">
          {effortDescription}
        </Text>
      </View>
      <View className="gap-1.5">
        {slider}
        {ends}
      </View>
    </View>
  );
}

/*
 * Each on/off option the Agent offers, such as Fast mode, is a row with a switch.
 * Desktop shows the description under the name; the phone puts it behind an info button, as Effort does.
 */
function SwitchOptions({
  configuration,
}: {
  configuration: ComposerConfigurationProps;
}): React.JSX.Element | null {
  const wide = useWide();
  const options = switches(configuration);
  if (!options.length) return null;
  return (
    // The same insets as the rows above, so the labels line up.
    <View className="px-gutter-list native:px-0 wide:px-0">
      {options.map((option) => {
        const label = (
          <Text selectable={false} role="body" className="select-none">
            {option.name}
          </Text>
        );
        // The row is the control, so the switch only shows its state.
        const toggle = (
          <View
            pointerEvents="none"
            aria-hidden
            importantForAccessibility="no-hide-descendants"
          >
            <Switch
              size={wide ? 'small' : 'default'}
              checked={option.currentValue}
              onCheckedChange={() => {}}
            />
          </View>
        );
        const rowProps = {
          accessibilityRole: 'switch',
          accessibilityLabel: option.name,
          accessibilityState: { checked: option.currentValue },
          'aria-checked': option.currentValue,
          onPress: () =>
            configuration.onConfigChange(option.configId, !option.currentValue),
        } as const;
        if (!wide)
          return (
            <Pressable
              key={option.configId}
              {...rowProps}
              className="h-11 px-2.5 web:px-3 native:px-0 flex-row items-center gap-2"
            >
              {label}
              {option.description ? (
                // The margin sits the icon 6px after the label.
                <View className="-ml-2">
                  <InfoPopover
                    accessibilityLabel={`About ${option.name.toLowerCase()}`}
                    text={option.description}
                  />
                </View>
              ) : null}
              <View className="flex-1" />
              {toggle}
            </Pressable>
          );
        return (
          <Pressable
            key={option.configId}
            {...rowProps}
            className="px-2 py-2 flex-row items-center gap-3 rounded-sm web:outline-none web:hover:bg-accent web:focus-visible:bg-accent"
          >
            <View className="flex-1 min-w-0 gap-0.5">
              {label}
              {option.description ? (
                <Text
                  selectable={false}
                  role="secondary"
                  className="select-none"
                >
                  {option.description}
                </Text>
              ) : null}
            </View>
            {toggle}
          </Pressable>
        );
      })}
    </View>
  );
}

export function AgentModelMenu({
  configuration,
  onOpenPage,
}: {
  configuration: ComposerConfigurationProps;
  // A native sheet pushes its own pages; otherwise the menu swaps them in place.
  onOpenPage?: (page: 'agent' | 'model') => void;
}): React.JSX.Element {
  const wide = useWide();
  const [page, setPage] = useState<'settings' | 'agent' | 'model'>('settings');
  const openPage = onOpenPage ?? setPage;
  const agent = configuration.agents.find(
    (entry) => entry.agent === configuration.agent,
  );
  const model = selection(configuration, 'model');
  const current = configurationChoices(model).find(
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
          <IconButton
            variant="ghost"
            accessibilityLabel="Back to Agent and model"
            className="size-11 sm:size-11"
            onPress={() => setPage('settings')}
            icon={'chevron-left'}
            iconSize="md"
            iconClassName={'text-foreground'}
            size="md"
          />
          <Text
            selectable={false}
            role="control"
            className="select-none flex-1 text-center"
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
            <ModelList configuration={configuration} />
          </>
        ) : (
          <FieldGroup>
            <FieldGroup.Section className="px-gutter-list py-1 gap-0.5">
              <Pressable
                accessibilityLabel="Choose Agent"
                onPress={() => openPage('agent')}
                role="button"
                className={contentActionClass({
                  variant: 'ghost',
                  className:
                    'h-11 sm:h-11 px-2.5 native:px-0 gap-2 justify-start',
                })}
              >
                <Text
                  selectable={false}
                  role="body"
                  className="select-none flex-1"
                >
                  Agent
                </Text>
                <Logo agent={agent} />
                <Text
                  selectable={false}
                  role="body"
                  className="select-none text-muted-foreground"
                >
                  {agent?.label}
                </Text>
                <Icon
                  size="xs"
                  name="chevron-right"
                  className="-ml-0.5 text-muted-foreground"
                />
              </Pressable>
              <Pressable
                accessibilityLabel="Choose model"
                onPress={() => openPage('model')}
                role="button"
                className={contentActionClass({
                  variant: 'ghost',
                  className:
                    'h-11 sm:h-11 px-2.5 native:px-0 gap-2 justify-start',
                })}
              >
                <Text
                  selectable={false}
                  role="body"
                  className="select-none flex-1"
                >
                  Model
                </Text>
                <Text
                  selectable={false}
                  role="body"
                  className="select-none text-muted-foreground"
                >
                  {modelName(current)}
                </Text>
                <Icon
                  size="xs"
                  name="chevron-right"
                  className="-ml-0.5 text-muted-foreground"
                />
              </Pressable>
            </FieldGroup.Section>
            {(switches(configuration).length > 0 ||
              currentEffort(configuration).selected) && (
              <FieldGroup.Section>
                {switches(configuration).length > 0 && (
                  <SwitchOptions configuration={configuration} />
                )}
                {currentEffort(configuration).selected && (
                  <EffortControl configuration={configuration} />
                )}
              </FieldGroup.Section>
            )}
          </FieldGroup>
        )}
        {wide && <SwitchOptions configuration={configuration} />}
        {wide && <EffortControl configuration={configuration} />}
        {configuration.turnRunning && (
          <View className="flex-row gap-2 px-gutter wide:px-3 py-2.5 bg-muted">
            <Icon name="waiting" className="text-muted-foreground" />
            <Text
              selectable={false}
              role="secondary"
              className="select-none flex-1"
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
}): React.JSX.Element | null {
  const wide = useContentWide();
  const windowWide = useWide();
  const model = selection(configuration, 'model');
  const current = configurationChoices(model).find(
    (choice) => choice.value === model?.currentValue,
  );
  const effort = currentEffort(configuration);
  const effortLabel = effort.selected?.name;
  const fastOn = switches(configuration).some(
    (option) => option.configId === fastModeConfigId && option.currentValue,
  );
  // Commit the fallback level so what is shown is what the Agent runs with.
  const fallbackValue = effort.fallback ? effort.selected?.value : undefined;
  const effortConfigId = effort.option?.configId;
  // The latest callback is read through a ref so a new callback identity does not commit again.
  const onConfigChange = useRef(configuration.onConfigChange);
  useEffect(() => {
    onConfigChange.current = configuration.onConfigChange;
  });
  useEffect(() => {
    if (effortConfigId && fallbackValue)
      onConfigChange.current(effortConfigId, fallbackValue);
  }, [effortConfigId, fallbackValue]);
  const agent = configuration.agents.find(
    (entry) => entry.agent === configuration.agent,
  );
  const presentSheet = useNativeSheets()?.agentModel;
  const nativeSheet = presentSheet && !windowWide;
  useEffect(() => {
    if (nativeSheet) publishAgentModelConfiguration(configuration);
  }, [nativeSheet, configuration]);
  if (!model && !agent) return null;
  return (
    <ComposerPopover
      label="Agent and model"
      width={model ? agentModelMenuWidth : agentMenuWidth}
      className="shrink min-w-0"
      onPresent={nativeSheet ? presentSheet : undefined}
      trigger={
        <Pressable
          disabled={disabled}
          accessibilityLabel="Agent and model"
          role="button"
          className={contentActionClass({
            variant: 'ghost',
            className:
              'h-7 sm:h-7 py-0 px-1.5 has-[>[data-icon]]:px-1.5 gap-1.5 shrink min-w-0',
            disabled: disabled,
          })}
        >
          {wide && <Logo agent={agent} />}
          <Text
            selectable={false}
            numberOfLines={1}
            role="control"
            className="select-none min-w-0 shrink"
          >
            {modelName(current) || agent?.label}
          </Text>
          {wide &&
            current?._meta?.argo?.supportsEffort !== false &&
            effortLabel && (
              <Text
                selectable={false}
                role="control"
                className="select-none text-muted-foreground shrink-0"
                numberOfLines={1}
              >
                {effortLabel}
              </Text>
            )}
          {fastOn && (
            <Icon
              name="fast-mode"
              filled
              className="text-foreground"
              testID="fast-mode-on"
            />
          )}
          {wide && (
            <Icon
              size="xs"
              name="chevron-down"
              className="-ml-0.5 text-muted-foreground"
            />
          )}
        </Pressable>
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
}): React.JSX.Element | null {
  const wide = useContentWide();
  const mode = selection(configuration, 'mode');
  const current = configurationChoices(mode).find(
    (choice) => choice.value === mode?.currentValue,
  );
  if (!mode) return null;
  return (
    <ComposerPopover
      label="Mode"
      trigger={
        <Pressable
          disabled={disabled}
          accessibilityLabel="Mode"
          role="button"
          className={contentActionClass({
            variant: 'ghost',
            className: cn(
              'h-7 sm:h-7 py-0 gap-1.5',
              wide
                ? 'w-auto px-1.5 has-[>[data-icon]]:px-1.5'
                : 'w-7 p-0 has-[>[data-icon]]:px-0',
            ),
            disabled: disabled,
          })}
        >
          <Icon
            name={configurationIcon(current?._meta?.argo?.icon)}
            className={cn(
              'text-muted-foreground',
              current?._meta?.argo?.tone === 'dangerous' &&
                destructiveTextClassName,
            )}
          />
          <Text
            selectable={false}
            role="control"
            className={cn(
              'select-none text-muted-foreground',
              !wide && 'hidden',
              current?._meta?.argo?.tone === 'dangerous' &&
                destructiveTextClassName,
            )}
          >
            {current?.name.replace(/\s*\(recommended\)\s*$/i, '')}
          </Text>
          <View className={cn('-ml-0.5', !wide && 'hidden')}>
            <Icon
              size="xs"
              name="chevron-down"
              className="text-muted-foreground"
            />
          </View>
        </Pressable>
      }
    >
      {(close) => (
        <View className="px-gutter-list py-1 wide:p-1 gap-0.5">
          <MenuHeading>Mode</MenuHeading>
          {configurationChoices(mode).map((choice) => (
            <Choice
              key={choice.value}
              selected={choice.value === mode.currentValue}
              label={choice.name}
              description={choice.description}
              dangerous={choice._meta?.argo?.tone === 'dangerous'}
              leading={
                <Icon
                  name={configurationIcon(choice._meta?.argo?.icon)}
                  className={cn(
                    'text-foreground',
                    choice._meta?.argo?.tone === 'dangerous' &&
                      destructiveTextClassName,
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
}): React.JSX.Element {
  return (
    <View className="px-gutter-list py-1 wide:p-1 gap-0.5">
      {[false, true].map((newWorktree) => (
        <Choice
          key={String(newWorktree)}
          label={newWorktree ? 'New worktree' : 'Local'}
          selected={checkout.newWorktree === newWorktree}
          leading={
            <Icon
              name={newWorktree ? 'branch' : 'folder'}
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
}): React.JSX.Element {
  const created = !!checkout.path;
  const editable = !created && !!checkout.onNewWorktreeChange;
  if (created || !editable)
    return (
      <View className="h-7 min-w-0 max-w-96 px-1.5 flex-row items-center gap-1.5">
        <Icon
          name={checkout.newWorktree ? 'branch' : 'folder'}
          className="text-muted-foreground"
        />
        <Text
          selectable={false}
          numberOfLines={1}
          role={checkout.newWorktree ? 'code' : 'secondary'}
          className={cn('select-none min-w-0 shrink')}
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
        <Pressable
          disabled={disabled}
          accessibilityLabel="Checkout"
          role="button"
          className={contentActionClass({
            variant: 'ghost',
            className:
              'h-7 sm:h-7 py-0 px-1.5 has-[>[data-icon]]:px-1.5 pr-0.25 has-[>[data-icon]]:pr-0.25 gap-1.5 rounded-md border-0 bg-transparent shadow-none',
            disabled: disabled,
          })}
        >
          <Icon
            name={checkout.newWorktree ? 'branch' : 'folder'}
            className="text-muted-foreground"
          />
          <Text selectable={false} role="secondary" className="select-none">
            {checkout.newWorktree ? 'New worktree' : 'Local'}
          </Text>
          <Icon
            size="xs"
            name="chevron-down"
            className="text-muted-foreground"
          />
        </Pressable>
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
