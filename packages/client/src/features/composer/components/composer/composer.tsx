import { maxBlobUploadMebibytes } from '@repo/contracts';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import { View } from 'react-native';
import { filledClass, useSessionFill } from '#lib/product/session-fill';
import { QueueEditorsProvider } from '../prompt-queue/queue-editors';
import {
  queueCommand,
  useQueueComposer,
} from '../prompt-queue/use-queue-composer';
import { ComposerControls } from './composer-card';
import { oversizedAttachmentIds, sendButtonState } from './composer-conditions';
import { useComposerLayout } from './composer-layout';
import { ComposerTray } from './composer-tray';
import { ComposerPhoneTray } from './composer-trays';
import type { ComposerProps } from './composer-types';
import { ComposerTypography } from './composer-typography';

export type { ComposerDraft, ComposerProps } from './composer-types';

export type { ComposerAttachment } from '../composer-attachment-card/composer-attachment-card';

export function Composer(props: ComposerProps): React.JSX.Element {
  return (
    <ComposerTypography>
      <QueueEditorsProvider command={queueCommand(props.promptQueue)}>
        <ComposerBody {...props} />
      </QueueEditorsProvider>
    </ComposerTypography>
  );
}

function ComposerBody(input: ComposerProps): React.JSX.Element {
  const props = useQueueComposer(input);
  const sendState = sendButtonState(props);
  const layout = useComposerLayout(props, sendState);
  useComposerToasts(props);

  return (
    <View nativeID={layout.composerId} className={useComposerClass()}>
      <ComposerPhoneTray {...layout} />
      <ComposerTray {...layout} />
      <ComposerControls key={props.queueEdit?.id ?? 'draft'} {...layout} />
    </View>
  );
}

// Filled, the Composer takes the Session column's height for its request.
function useComposerClass(): string {
  return cn(
    'w-full min-h-0 shrink items-center',
    useSessionFill().filled && filledClass,
  );
}

const attachmentLimitMessage = `Attachment exceeds ${maxBlobUploadMebibytes} MB.`;

function useComposerToasts(props: ComposerProps): void {
  const { error, errorKey } = props;
  const key = oversizedAttachmentIds(props).sort().join('\n');
  useErrorToast(error ? { title: error, key: errorKey } : undefined);
  useErrorToast(key ? { title: attachmentLimitMessage, key } : undefined);
}
