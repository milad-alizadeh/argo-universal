import type { AgentInfo, SessionConfigSelectOption } from '@repo/contracts';
import type * as React from 'react';
import { useContentWide } from '#lib/product/content-layout';
import { Button } from '#primitives/buttons/button/button';
import { Spinner } from '#primitives/display/spinner/spinner';
import { ComposerPopover } from '../composer-popover/composer-popover';
import { AgentIcon } from './agent-icon';
import { AgentModelMenu } from './agent-model-menu';
import { AgentModelTrailing } from './agent-model-trailing';
import {
  useAgentModelSheet,
  useCommitEffortFallback,
} from './configuration-effects';
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
  const presentSheet = useAgentModelSheet(props.configuration);
  const wide = useContentWide();
  useCommitEffortFallback(props.configuration);
  if (!selection(props.configuration, 'model') && !agent) return null;
  const popoverProps = { ...props, agent, wide, onPresent: presentSheet };
  return <AgentModelPopover {...popoverProps} />;
}

const agentModelPopoverLayout = {
  width: agentModelMenuWidth,
  className: 'shrink min-w-0',
};
function AgentModelPopover(
  props: TriggerProps & { onPresent?: () => void },
): React.JSX.Element {
  return (
    <ComposerPopover
      listContent
      label="Agent and model"
      {...agentModelPopoverLayout}
      onPresent={props.onPresent}
      trigger={agentModelTrigger(props)}
    >
      {(close) => agentModelMenu(props.configuration, close)}
    </ComposerPopover>
  );
}
function agentModelMenu(
  configuration: ComposerConfigurationProps,
  close: (after?: () => void) => void,
): React.JSX.Element {
  return (
    <AgentModelMenu configuration={leavingAfterClose(configuration, close)} />
  );
}
// Add a new agent leaves the page, so the whole menu closes before it goes.
function leavingAfterClose(
  configuration: ComposerConfigurationProps,
  close: (after?: () => void) => void,
): ComposerConfigurationProps {
  const { onAddAgent } = configuration;
  return onAddAgent
    ? { ...configuration, onAddAgent: () => close(onAddAgent) }
    : configuration;
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
    return <Spinner label="Opening the Session" />;
  return props.wide ? <AgentIcon agent={props.agent} /> : undefined;
}
function agentModelButtonProps(
  props: TriggerProps,
  current?: SessionConfigSelectOption,
): Extract<React.ComponentProps<typeof Button>, { appearance?: 'content' }> {
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
  appearance: 'content',
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
