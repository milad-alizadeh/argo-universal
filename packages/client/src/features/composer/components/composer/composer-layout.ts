import type { RichTextareaHandle } from '@repo/kit/primitives/controls/rich-textarea';
import { useCallback, useId, useRef } from 'react';
import { useContentWide } from '#lib/product/content-layout';
import {
  callPointer,
  isConfigurationInactive,
  isInactive,
} from './composer-conditions';
import type { ComposerLayout, ComposerProps } from './composer-types';

export function useComposerLayout(
  props: ComposerProps,
  sendState: ComposerLayout['sendState'],
): ComposerLayout {
  const composerId = useId();
  const wide = useContentWide();
  const field = useMessageField();

  const send = draftSender(props, sendState);
  const modifiedSend = draftSender(props, sendState, true);

  return Object.assign(
    { props, composerId, field, wide, sendState, send, modifiedSend },
    { callPointer: callPointer(props) },
    composerActivity(props),
  );
}

function composerActivity(
  props: ComposerProps,
): Pick<ComposerLayout, 'inactive' | 'configurationInactive'> {
  return {
    inactive: isInactive(props),
    configurationInactive: isConfigurationInactive(props),
  };
}

// The message field's handle, held in a ref and reached through functions, so a choice can write into it.
function useMessageField(): ComposerLayout['field'] {
  const handle = useRef<RichTextareaHandle | null>(null);

  const attach = useCallback((next: RichTextareaHandle | null) => {
    handle.current = next;
  }, []);

  const insertWord = useCallback((word: string) => {
    handle.current?.insertWord(word);
  }, []);

  return { attach, insertWord };
}

function draftSender(
  props: ComposerProps,
  state: ComposerLayout['sendState'],
  steer = false,
): () => void {
  const submit = steer ? modifiedSender(props) : props.onSend;

  return () => {
    if (state === 'ready') submit(props.draft);
  };
}

function modifiedSender(props: ComposerProps): ComposerProps['onSend'] {
  if (props.queueEdit) return props.onSend;

  return props.onSteer ?? props.onSend;
}
