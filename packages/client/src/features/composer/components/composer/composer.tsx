import { maxBlobUploadMebibytes } from '@repo/contracts';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import { View } from 'react-native';
import { PermissionRequest } from '#features/requests';
import { filledClass, useSessionFill } from '#lib/product/session-fill';
import { ComposerControls } from './composer-card';
import { oversizedAttachmentIds, sendButtonState } from './composer-conditions';
import { useComposerLayout } from './composer-layout';
import { composerTrayClass } from './composer-tray-class';
import { ComposerTopTray } from './composer-trays';
import type { ComposerLayout, ComposerProps } from './composer-types';

export type { ComposerDraft, ComposerProps } from './composer-types';

export type { ComposerAttachment } from '../composer-attachment-card/composer-attachment-card';

export function Composer(props: ComposerProps): React.JSX.Element {
  const sendState = sendButtonState(props);
  const layout = useComposerLayout(props, sendState);
  useComposerToasts(props);

  return (
    <View nativeID={layout.composerId} className={useComposerClass()}>
      <ComposerTopTray {...layout} />
      <ComposerRequest {...layout} />
      <ComposerControls {...layout} />
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

const requestTrayClass = cn(
  composerTrayClass,
  '-mb-3 pb-3 rounded-t-xl overflow-hidden',
);

const requestClass = (wide: boolean, filled: boolean): string =>
  cn(wide && requestTrayClass, filled && filledClass);

const attachmentLimitMessage = `Attachment exceeds ${maxBlobUploadMebibytes} MB.`;

function useComposerToasts(props: ComposerProps): void {
  const { error, errorKey } = props;
  const key = oversizedAttachmentIds(props).sort().join('\n');
  useErrorToast(error ? { title: error, key: errorKey } : undefined);
  useErrorToast(key ? { title: attachmentLimitMessage, key } : undefined);
}

function ComposerRequest(layout: ComposerLayout): React.JSX.Element | null {
  const filled = useSessionFill().filled;

  if (!hasComposerRequest(layout)) return null;

  return (
    <View className={requestClass(layout.wide, filled)}>
      <ComposerRequestSurface {...layout} />
    </View>
  );
}

function composerRequestContent({ props }: ComposerLayout): React.ReactNode {
  if (props.permissionRequest)
    return <PermissionRequest {...props.permissionRequest} />;

  return props.callout;
}

function hasComposerRequest({ props }: ComposerLayout): boolean {
  return Boolean(props.permissionRequest || props.callout);
}

function ComposerRequestSurface(layout: ComposerLayout): React.ReactNode {
  return composerRequestContent(layout);
}
