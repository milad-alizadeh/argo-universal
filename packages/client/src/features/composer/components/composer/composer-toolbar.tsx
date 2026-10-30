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

/*
 * The order the toolbar gives its width up in, as the layout's regions have one (docs/agents/layout.md).
 * Attach and Send keep theirs, so a fixed glyph is never squeezed out of its box and painted over the pill
 * beside it. The two pills keep theirs next: the row wraps to a second line before either is narrowed, which
 * is what the largest Dynamic Type sizes need. Only once a whole line is too narrow does a pill truncate.
 */
const toolbarClassName =
  'pointer-events-box-none shrink-0 flex-row flex-wrap items-center justify-end gap-x-2 gap-y-1.5 pl-2 pr-2.5 wide:px-4.75 pb-2.5';

export function ComposerToolbar(layout: ToolbarLayout): React.JSX.Element {
  return (
    <View className={toolbarClassName}>
      <ComposerLeftControls {...layout} />
      <ComposerRightControls {...layout} />
    </View>
  );
}

/*
 * `grow`, not `flex-1`: a zero basis would make the group's width count for nothing when the row decides
 * where to break, and the pills inside it would be crushed instead of moved to their own line.
 */
const leftControlsClassName = (inactive: boolean): string =>
  cn(
    'min-w-0 max-w-full grow flex-row items-center gap-1',
    inactive ? 'pointer-events-none' : 'pointer-events-box-none',
  );

function ComposerLeftControls(layout: LeftControlsLayout): React.JSX.Element {
  return (
    <View className={leftControlsClassName(layout.configurationInactive)}>
      <View className="shrink-0">
        <ComposerAttachMenu {...layout} />
      </View>
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
    <View className="pointer-events-box-none max-w-full shrink-0 flex-row items-center gap-2.5">
      <ComposerConfigurationActions {...layout} />
      <View className="shrink-0">
        <ComposerSendButton {...layout} />
      </View>
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
