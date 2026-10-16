import type { AgentInfo } from '@repo/contracts';
import type * as React from 'react';
import { useState } from 'react';
import { useContentWide } from '#lib/product/content-layout';
import { Spinner } from '#primitives/display/spinner';
import { MenuTrigger, type MenuTriggerProps } from '#primitives/overlays/menu';
import { Sheet } from '#primitives/overlays/sheet';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import { ComposerPopover } from '../composer-popover/composer-popover';
import { AgentIcon } from './agent-icon';
import { AgentModelMenu, isDesktopMenu } from './agent-model-menu';
import { AgentModelTrailing } from './agent-model-trailing';
import { useCommitEffortFallback } from './configuration-effects';
import type { ComposerConfigurationProps } from './configuration-types';
import { selectedChoice, selection, modelName } from './configuration-values';

interface ControlProps {
  configuration: ComposerConfigurationProps;
  disabled: boolean;
}

interface TriggerProps extends ControlProps {
  agent?: AgentInfo;
  wide: boolean;
}

const agentModelMenuWidth = 320;

export function ComposerAgentModelControl(
  props: ControlProps,
): React.JSX.Element | null {
  const agent = selectedAgent(props.configuration);
  const wide = useContentWide();

  useCommitEffortFallback(props.configuration);

  if (!selection(props.configuration, 'model') && !agent) return null;

  return <AgentModelOverlay {...props} agent={agent} wide={wide} />;
}

// Desktop opens the menu as a popover; everything else opens the Sheet.
function AgentModelOverlay(props: TriggerProps): React.JSX.Element {
  if (isDesktopMenu(useWide())) return <AgentModelPopover {...props} />;

  return <AgentModelSheet {...props} />;
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
      {() => <AgentModelMenu configuration={props.configuration} />}
    </ComposerPopover>
  );
}

// Elsewhere Configure is a sheet whose Agent and Model rows push their choices as pages.
function AgentModelSheet(props: TriggerProps): React.JSX.Element {
  const [open, setOpen] = useState(false);

  if (props.disabled && open) setOpen(false);

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
      <AgentModelMenu configuration={configuration} />
    </Sheet.Page>
  );
}

function agentModelTrigger(props: TriggerProps): React.JSX.Element {
  return <MenuTrigger {...agentModelTriggerProps(props)} />;
}

function agentModelTriggerProps(props: TriggerProps): MenuTriggerProps {
  const current = selectedChoice(props.configuration, 'model');
  const { configuration, wide } = props;

  return {
    label: modelName(current) || agentLabel(props.agent),
    accessibilityLabel: 'Agent and model',
    disabled: props.disabled,
    leading: agentModelLeading(props),
    trailing: <AgentModelTrailing configuration={configuration} wide={wide} />,
  };
}

// A spinner while the Session opens; wide, the Agent's icon otherwise.
function agentModelLeading(props: TriggerProps): React.JSX.Element | undefined {
  if (props.configuration.opening)
    return <Spinner accessibilityLabel="Opening the Session" />;

  return props.wide ? <AgentIcon agent={props.agent} /> : undefined;
}

function agentLabel(agent?: AgentInfo): string {
  return agent?.label || '';
}

function selectedAgent(
  configuration: ComposerConfigurationProps,
): AgentInfo | undefined {
  return configuration.agents.find(
    (entry) => entry.agent === configuration.agent,
  );
}
