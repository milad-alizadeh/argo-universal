import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import { View } from 'react-native';
import {
  ComposerAgentModelControl,
  ComposerModeControl,
} from '../composer-configuration/composer-configuration';
import { ComposerStatusControls } from '../composer-status/composer-status';
import { ComposerAttachMenu } from './composer-attach-menu';
import type {
  ToolbarLayout,
  LeftControlsLayout,
  AgentControlLayout,
  PhoneStatusLayout,
  RightControlsLayout,
  ConfigurationActionsLayout,
  SendLayout,
} from './composer-toolbar-types';

export function ComposerToolbar(layout: ToolbarLayout): React.JSX.Element {
  return (
    <View className="pointer-events-box-none flex-row items-center justify-between gap-2 pl-2 pr-2.5 wide:px-4.75 pb-2.5">
      <ComposerLeftControls {...layout} />
      <ComposerRightControls {...layout} />
    </View>
  );
}

const leftControlsClassName = (inactive: boolean): string =>
  cn(
    'min-w-0 flex-1 flex-row items-center gap-1',
    inactive ? 'pointer-events-none' : 'pointer-events-box-none',
  );

function ComposerLeftControls(layout: LeftControlsLayout): React.JSX.Element {
  return (
    <View className={leftControlsClassName(layout.configurationInactive)}>
      <ComposerAttachMenu {...layout} />
      <ComposerAgentControl {...layout} />
      <ComposerPhoneStatus {...layout} />
    </View>
  );
}

function ComposerAgentControl({
  props,
  configurationInactive,
}: AgentControlLayout): React.JSX.Element | null {
  return props.configuration ? (
    <ComposerAgentModelControl
      configuration={props.configuration}
      disabled={configurationInactive}
    />
  ) : null;
}

function ComposerPhoneStatus({
  props,
  wide,
  inactive,
}: PhoneStatusLayout): React.JSX.Element | null {
  if (wide) return null;

  return props.status ? (
    <ComposerStatusControls status={props.status} disabled={inactive} />
  ) : null;
}

function ComposerRightControls(layout: RightControlsLayout): React.JSX.Element {
  return (
    <View className="pointer-events-box-none flex-row items-center gap-2.5">
      <ComposerConfigurationActions {...layout} />
      <ComposerSendButton {...layout} />
    </View>
  );
}

function ComposerConfigurationActions(
  layout: ConfigurationActionsLayout,
): React.JSX.Element | null {
  if (!layout.props.configuration) return null;

  const controls = {
    configuration: layout.props.configuration,
    disabled: layout.inactive,
  };

  return <ComposerModeControl {...controls} />;
}

function ComposerSendButton(layout: SendLayout): React.JSX.Element {
  return <IconButton {...sendButtonProps(layout)} />;
}

function sendButtonProps(
  layout: SendLayout,
): React.ComponentProps<typeof IconButton> {
  const action = sendButtonAction(layout);

  return {
    ...action,
    ...filledSendProps,
    'aria-busy': layout.sendState === 'sending',
  };
}

function sendButtonAction(
  layout: SendLayout,
): React.ComponentProps<typeof IconButton> {
  if (layout.sendState === 'stop') return stopButtonAction(layout);

  return {
    accessibilityLabel: 'Send',
    icon: 'arrow-up',
    disabled: layout.sendState !== 'ready',
    onPress: layout.send,
  };
}

function stopButtonAction(
  layout: Pick<SendLayout, 'props'>,
): React.ComponentProps<typeof IconButton> {
  return {
    accessibilityLabel: 'Stop',
    icon: 'cancelled',
    disabled: layout.props.disabled,
    onPress: (): void => layout.props.onStop?.(),
  };
}

const filledSendProps = {
  variant: 'primary',
  size: 'sm',
} as const;
