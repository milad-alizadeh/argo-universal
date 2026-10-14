import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { IconButton } from '#primitives/buttons/icon-button';
import {
  ComposerAgentModelControl,
  ComposerModeControl,
} from '../composer-configuration/composer-configuration';
import { ComposerOptions } from '../composer-options/composer-options';
import { ComposerStatusControls } from '../composer-status/composer-status';
import { ComposerAttachMenu, composerIconButton } from './composer-attach-menu';
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
    <View
      pointerEvents="box-none"
      className="flex-row items-center justify-between gap-2 pl-2 wide:pl-3.75 pr-2.5 pb-2.5"
    >
      <ComposerLeftControls {...layout} />
      <ComposerRightControls {...layout} />
    </View>
  );
}

function ComposerLeftControls(layout: LeftControlsLayout): React.JSX.Element {
  return (
    <View
      pointerEvents={layout.configurationInactive ? 'none' : 'box-none'}
      className="min-w-0 flex-1 flex-row items-center gap-1"
    >
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
    <View pointerEvents="box-none" className="flex-row items-center gap-2.5">
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

  return (
    <>
      <ComposerOptions {...controls} />
      <ComposerModeControl {...controls} />
    </>
  );
}

function ComposerSendButton(layout: SendLayout): React.JSX.Element {
  return <IconButton {...sendButtonProps(layout)} />;
}

function sendButtonProps(
  layout: SendLayout,
): React.ComponentProps<typeof IconButton> {
  return {
    ...sendButtonAction(layout),
    ...filledSendProps,
    loading: layout.sendState === 'sending',
    className: cn(
      'rounded-full',
      composerIconButton,
      layout.sendState === 'blocked' && 'opacity-35',
    ),
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
  variant: 'filled',
  iconFilled: true,
  hitSlop: 8,
  iconRole: 'control',
  iconWeight: 'light',
} as const;
