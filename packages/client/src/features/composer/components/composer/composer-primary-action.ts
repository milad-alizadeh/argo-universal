import type { IconButton } from '@repo/kit/primitives/actions/icon-button';
import type * as React from 'react';
import type { SendLayout } from './composer-toolbar-types';

export const endButtonId = 'composer-end';

export const voiceButtonId = 'composer-voice';

type IconButtonProps = React.ComponentProps<typeof IconButton>;

type PrimaryAction = (layout: SendLayout) => IconButtonProps;

function sendAction(layout: SendLayout): IconButtonProps {
  return {
    accessibilityLabel: 'Send',
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

export function stopButtonAction(
  layout: Pick<SendLayout, 'props'>,
): IconButtonProps {
  return {
    accessibilityLabel: 'Stop',
    icon: 'cancelled',
    disabled: layout.props.disabled,
    onPress: (): void => layout.props.onStop?.(),
  };
}

// Option B of the Voice page's button states: Send's circle with the voice bars, which starts a call.
function voiceAction(layout: SendLayout): IconButtonProps {
  return {
    accessibilityLabel: 'Start voice call',
    testID: voiceButtonId,
    icon: 'voice-bars',
    onPress: (): void => layout.props.voice?.onStart(),
  };
}

// The pointer to a call in another Session is no button action: the toolbar draws it, so it has no entry here.
const primaryActions: Record<
  Exclude<SendLayout['sendState'], 'elsewhere'>,
  PrimaryAction
> = {
  stop: stopButtonAction,
  end: endAction,
  connecting: endAction,
  ready: sendAction,
  sending: sendAction,
  blocked: sendAction,
  voice: voiceAction,
};

export function sendButtonAction(layout: SendLayout): IconButtonProps {
  const action =
    layout.sendState === 'elsewhere'
      ? sendAction
      : primaryActions[layout.sendState];

  return action(layout);
}
