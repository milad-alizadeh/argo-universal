import type { IconButton } from '@repo/kit/primitives/actions/icon-button';
import type * as React from 'react';
import { sendsToQueue } from './composer-conditions';
import type { SendLayout } from './composer-toolbar-types';
import type { ComposerConversation } from './composer-types';

export const endButtonId = 'composer-end';

export const conversationButtonId = 'composer-voice';

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
    onPress: (): void => endOf(layout.props.voice)?.(),
  };
}

// End belongs to a call connecting or connected here.
const endOf = (voice: ComposerConversation | undefined): (() => void) | undefined =>
  voice && 'onEnd' in voice ? voice.onEnd : undefined;

const startOf = (voice: ComposerConversation | undefined): (() => void) | undefined =>
  voice?.kind === 'start' ? voice.onStart : undefined;

function stopButtonAction(layout: Pick<SendLayout, 'props'>): IconButtonProps {
  return {
    accessibilityLabel: 'Stop',
    icon: 'cancelled',
    disabled: layout.props.disabled,
    onPress: (): void => layout.props.onStop?.(),
  };
}

// Option B of the Conversation page's button states: Send's circle with the voice bars, which starts a call.
function conversationAction(layout: SendLayout): IconButtonProps {
  return {
    accessibilityLabel: 'Start Conversation',
    testID: conversationButtonId,
    icon: 'voice-bars',
    onPress: (): void => startOf(layout.props.voice)?.(),
  };
}

const primaryActions: Record<SendLayout['sendState'], PrimaryAction> = {
  stop: stopButtonAction,
  end: endAction,
  connecting: endAction,
  ready: sendAction,
  sending: sendAction,
  blocked: sendAction,
  voice: conversationAction,
};

export const sendButtonAction = (layout: SendLayout): IconButtonProps =>
  primaryActions[layout.sendState](layout);
