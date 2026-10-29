import { Icon } from '@repo/kit/primitives/content/icon';
import {
  MenuTrigger,
  type MenuTriggerProps,
} from '@repo/kit/primitives/overlays/menu';
import { Sheet } from '@repo/kit/primitives/overlays/sheet';
import { SizeClass } from '@repo/kit/size-class/size-class';
import type * as React from 'react';
import { Platform } from 'react-native';
import { useContentWide } from '#lib/product/content-layout';
import { useComposerOverlay } from '../../hooks/use-composer-overlay';
import { ComposerPopover } from '../composer-popover/composer-popover';
import {
  ChipTrigger,
  type ChipTriggerProps,
} from '../composer-status/chip-trigger';
import { AgentIcon } from './agent-icon';
import { AgentModelMenu } from './agent-model-menu';
import { AgentModelTrailing, agentModelEffort } from './agent-model-trailing';
import { useCommitEffortFallback } from './configuration-effects';
import type { ComposerConfigurationProps } from './configuration-types';
import {
  agentName,
  selectedChoice,
  selection,
  modelName,
} from './configuration-values';
import { useOptimisticConfig } from './use-optimistic-config';

interface ControlProps {
  configuration: ComposerConfigurationProps;
  disabled: boolean;
}

interface TriggerProps extends ControlProps {
  wide: boolean;
}

const agentModelMenuWidth = 320;

export function ComposerAgentModelControl(
  props: ControlProps,
): React.JSX.Element | null {
  const wide = useContentWide();
  const configuration = useOptimisticConfig(props.configuration);

  useCommitEffortFallback(props.configuration);

  if (nothingToConfigure(configuration)) return null;

  return (
    <AgentModelOverlay {...props} configuration={configuration} wide={wide} />
  );
}

// Hidden until an Agent is chosen, and while neither a model nor an installed Agent can show.
function nothingToConfigure(
  configuration: ComposerConfigurationProps,
): boolean {
  if (configuration.agent) return false;

  if (configuration.agentChoices) return false;

  return !hasModel(configuration);
}

// Desktop opens the menu as a popover; everything else opens the Sheet.
function AgentModelOverlay(props: TriggerProps): React.JSX.Element {
  if (Platform.OS !== 'web') return <AgentModelSheet {...props} />;

  return (
    <SizeClass
      compact={<AgentModelSheet {...props} />}
      wide={<AgentModelPopover {...props} />}
    />
  );
}

const agentModelPopoverLayout = {
  width: agentModelMenuWidth,
  className: 'shrink min-w-0',
};

// A desktop window keeps Configure in a popover, its Agent and Model choices in popovers beside it.
function AgentModelPopover(props: TriggerProps): React.JSX.Element {
  return (
    <ComposerPopover
      listContent
      label="Agent and model"
      {...agentModelPopoverLayout}
      trigger={agentModelTrigger(props)}
    >
      {() => <AgentModelMenu configuration={props.configuration} wide />}
    </ComposerPopover>
  );
}

// Elsewhere Configure is a sheet whose Model and option rows push their choices as pages.
function AgentModelSheet(props: TriggerProps): React.JSX.Element {
  const [open, setOpen] = useComposerOverlay(props.disabled);

  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      label="Agent and model"
      trigger={agentModelTrigger(props)}
      contentScrolls
    >
      {configurePage(props.configuration)}
    </Sheet>
  );
}

// Sheet reads the page declaration from its direct children.
function configurePage(
  configuration: ComposerConfigurationProps,
): React.JSX.Element {
  return (
    <Sheet.Screen name="configure" title="Agent and model">
      <AgentModelMenu configuration={configuration} wide={false} />
    </Sheet.Screen>
  );
}

/*
 * Wide, the picker Paper draws; narrow, one of the Composer's own chips. A phone's row has the width for the
 * model's name or for the mark that opens it, not both, and the pill already reads as something to press
 * (owner, 2026-10-21).
 */
function agentModelTrigger(props: TriggerProps): React.JSX.Element {
  if (!props.wide) return <ChipTrigger {...agentModelChipProps(props)} />;

  return <MenuTrigger {...agentModelTriggerProps(props)} />;
}

function agentModelChipProps(props: TriggerProps): ChipTriggerProps {
  return {
    label: triggerLabel(props),
    accessibilityLabel: 'Agent and model',
    disabled: props.disabled,
    trailing: (
      <AgentModelTrailing configuration={props.configuration} wide={false} />
    ),
  };
}

function agentModelTriggerProps(props: TriggerProps): MenuTriggerProps {
  const { configuration, wide } = props;

  return {
    label: triggerLabel(props),
    accessibilityLabel: 'Agent and model',
    detail: agentModelEffort(props),
    disabled: props.disabled,
    leading: agentModelLeading(props),
    trailing: <AgentModelTrailing configuration={configuration} wide={wide} />,
  };
}

// Keep the Agent identity stable while its settings load inside the picker; it is a control icon, as the other triggers'.
function agentModelLeading(props: TriggerProps): React.JSX.Element | undefined {
  if (!props.wide) return undefined;

  if (props.configuration.agent)
    return <AgentIcon agent={props.configuration.agent} size="sm" />;

  return <Icon name="agent" />;
}

// Unlike Configure's Agent row, the trigger shows no id for an Agent that is not installed.
function triggerLabel({ configuration }: TriggerProps): string {
  return (
    modelName(selectedChoice(configuration, 'model')) ||
    agentName(configuration.agent) ||
    'Choose Agent'
  );
}

function hasModel(configuration: ComposerConfigurationProps): boolean {
  return !!configuration.agentId && !!selection(configuration, 'model');
}
