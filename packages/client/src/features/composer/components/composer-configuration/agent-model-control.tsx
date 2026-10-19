import type * as React from 'react';
import { Platform } from 'react-native';
import { useContentWide } from '#lib/product/content-layout';
import { MenuTrigger, type MenuTriggerProps } from '#primitives/overlays/menu';
import { Sheet } from '#primitives/overlays/sheet';
import { Spinner } from '#primitives/status/spinner';
import { SizeClass } from '../../../../lib/generic/size-class/size-class';
import { useComposerOverlay } from '../../hooks/use-composer-overlay';
import { ComposerPopover } from '../composer-popover/composer-popover';
import { AgentIcon } from './agent-icon';
import { AgentModelMenu } from './agent-model-menu';
import { AgentModelTrailing } from './agent-model-trailing';
import { useCommitEffortFallback } from './configuration-effects';
import type { ComposerConfigurationProps } from './configuration-types';
import {
  agentName,
  selectedChoice,
  selection,
  modelName,
} from './configuration-values';

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

  useCommitEffortFallback(props.configuration);

  if (nothingToConfigure(props.configuration)) return null;

  return <AgentModelOverlay {...props} wide={wide} />;
}

// Hidden until an Agent is chosen, and while neither a model nor an installed Agent can show.
function nothingToConfigure(
  configuration: ComposerConfigurationProps,
): boolean {
  if (configuration.agent) return false;

  return !configuration.agentId || !selection(configuration, 'model');
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

// Elsewhere Configure is a sheet whose Agent and Model rows push their choices as pages.
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
    <Sheet.Page name="configure" title="Configure">
      <AgentModelMenu configuration={configuration} wide={false} />
    </Sheet.Page>
  );
}

function agentModelTrigger(props: TriggerProps): React.JSX.Element {
  return <MenuTrigger {...agentModelTriggerProps(props)} />;
}

function agentModelTriggerProps(props: TriggerProps): MenuTriggerProps {
  const { configuration, wide } = props;

  return {
    label: triggerLabel(props),
    accessibilityLabel: 'Agent and model',
    disabled: props.disabled,
    leading: agentModelLeading(props),
    trailing: <AgentModelTrailing configuration={configuration} wide={wide} />,
  };
}

// A spinner while the options load; wide, the Agent's icon otherwise.
function agentModelLeading(props: TriggerProps): React.JSX.Element | undefined {
  if (props.configuration.opening)
    return <Spinner accessibilityLabel="Loading options" />;

  return props.wide ? (
    <AgentIcon agent={props.configuration.agent} />
  ) : undefined;
}

// Unlike Configure's Agent row, the trigger shows no id for an Agent that is not installed.
function triggerLabel({ configuration }: TriggerProps): string {
  if (optionsAreOpening(configuration)) return 'Loading…';

  return (
    modelName(selectedChoice(configuration, 'model')) ||
    agentName(configuration.agent)
  );
}

const optionsAreOpening = (
  configuration: ComposerConfigurationProps,
): boolean =>
  Boolean(configuration.opening && !configuration.configOptions.length);
