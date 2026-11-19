import type { IconButton } from '@repo/kit/primitives/actions/icon-button';
import type * as React from 'react';
import { sendsToQueue } from './composer-conditions';
import type { SendLayout } from './composer-toolbar-types';

export const endButtonId = 'composer-end';

type IconButtonProps = React.ComponentProps<typeof IconButton>;

type PrimaryAction = (layout: SendLayout) => IconButtonProps;

function sendAction(layout: SendLayout): IconButtonProps {
  return {
    accessibilityLabel: sendsToQueue(layout.props) ? 'Queue' : 'Send',
    icon: 'arrow-up',
    disabled: layout.sendState !== 'ready',
    onPress: layout.send,
  };
}

function endAction(layout: SendLayout): IconButtonProps {
  return {
    accessibilityLabel: 'End',
    testID: endButtonId,
    icon: 'close',
    onPress: (): void => layout.props.voice?.onEnd(),
  };
}

function stopButtonAction(layout: Pick<SendLayout, 'props'>): IconButtonProps {
  return {
    accessibilityLabel: 'Stop',
    icon: 'cancelled',
    disabled: layout.props.disabled,
    onPress: (): void => layout.props.onStop?.(),
  };
}

// The voice button is not drawn yet (the Voice page of Paper draws End and the mute buttons only), so the voice state draws as the blocked Send button until it is.
const primaryActions: Record<SendLayout['sendState'], PrimaryAction> = {
  stop: stopButtonAction,
  end: endAction,
  connecting: endAction,
  ready: sendAction,
  sending: sendAction,
  blocked: sendAction,
  voice: sendAction,
};

export function sendButtonAction(layout: SendLayout): IconButtonProps {
  return primaryActions[layout.sendState](layout);
}
