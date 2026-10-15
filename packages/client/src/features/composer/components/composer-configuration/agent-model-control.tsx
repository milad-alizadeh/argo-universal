import type { AgentInfo, SessionConfigSelectOption } from '@repo/contracts';
import type * as React from 'react';
import { useState } from 'react';
import { useContentWide } from '#lib/product/content-layout';
import { Button } from '#primitives/buttons/button';
import { Spinner } from '#primitives/display/spinner';
import { Sheet, useSheet } from '#primitives/overlays/sheet';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import { ComposerPopover } from '../composer-popover/composer-popover';
import { AgentChoices } from './agent-choices';
import { AgentIcon } from './agent-icon';
import { AgentModelMenu, isDesktopMenu } from './agent-model-menu';
import { AgentModelTrailing } from './agent-model-trailing';
import { useCommitEffortFallback } from './configuration-effects';
import type { ComposerConfigurationProps } from './configuration-types';
import { selectedChoice, selection, modelName } from './configuration-values';
import { ModelChoices } from './model-choices';

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
      {configurationPages(props.configuration)}
    </Sheet>
  );
}

// The sheet reads its pages from its children, so they are elements, not a component of their own.
function configurationPages(
  configuration: ComposerConfigurationProps,
): React.JSX.Element[] {
  return [
    <Sheet.Page key="configure" name="configure" title="Configure">
      <AgentModelMenu configuration={configuration} />
    </Sheet.Page>,
    <Sheet.Page key="agent" name="agent" title="Select Agent">
      <ConfigurationChoices configuration={configuration} page="agent" />
    </Sheet.Page>,
    <Sheet.Page key="model" name="model" title="Select Model">
      <ConfigurationChoices configuration={configuration} page="model" />
    </Sheet.Page>,
  ];
}

// A choice is made, so the sheet goes back to Configure.
function ConfigurationChoices(props: {
  configuration: ComposerConfigurationProps;
  page: 'agent' | 'model';
}): React.JSX.Element {
  const sheet = useSheet();
  const Choices = props.page === 'agent' ? AgentChoices : ModelChoices;

  return <Choices configuration={props.configuration} onSelect={sheet.back} />;
}

function agentModelTrigger(props: TriggerProps): React.JSX.Element {
  const wide = props.wide;
  const current = selectedChoice(props.configuration, 'model');

  return (
    <Button
      {...agentModelButtonProps(props, current)}
      leading={agentModelLeading(props)}
      trailing={
        <AgentModelTrailing configuration={props.configuration} wide={wide} />
      }
    />
  );
}

// A spinner while the Session opens; wide, the Agent's icon otherwise.
function agentModelLeading(props: TriggerProps): React.JSX.Element | undefined {
  if (props.configuration.opening)
    return <Spinner accessibilityLabel="Opening the Session" />;

  return props.wide ? <AgentIcon agent={props.agent} /> : undefined;
}

function agentModelButtonProps(
  props: TriggerProps,
  current?: SessionConfigSelectOption,
): Extract<React.ComponentProps<typeof Button>, { custom: true }> {
  return {
    ...agentModelButtonAppearance,
    disabled: props.disabled,
    accessibilityLabel: 'Agent and model',
    label: modelName(current) || agentLabel(props.agent),
    labelNumberOfLines: 1,
    className: 'h-7 sm:h-7 py-0 px-1.5 gap-1.5 shrink min-w-0',
    labelClassName: 'min-w-0 shrink',
  };
}

const agentModelButtonAppearance = {
  custom: true,
  size: 'xs',
  variant: 'ghost',
} as const;

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
