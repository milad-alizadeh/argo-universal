import { maxBlobUploadMebibytes } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { PermissionRequest, PlanProposalCard } from '#features/requests';
import { useErrorToast } from '#lib/generic/primitives/overlays/toast/toast';
import { ComposerControls } from './composer-card';
import { sendButtonState } from './composer-conditions';
import { useComposerLayout } from './composer-layout';
import { ComposerTopTray } from './composer-trays';
import type { ComposerLayout, ComposerProps } from './composer-types';

export type { ComposerDraft, ComposerProps } from './composer-types';

export type { ComposerAttachment } from '../composer-attachment-card/composer-attachment-card';

export function Composer(props: ComposerProps): React.JSX.Element {
  const sendState = sendButtonState(props);
  const layout = useComposerLayout(props, sendState);
  useComposerToasts(props.error, layout.oversized);

  return (
    <View nativeID={layout.composerId} className="w-full items-center">
      <ComposerTopTray {...layout} />
      <ComposerRequest {...layout} />
      <ComposerControls {...layout} />
    </View>
  );
}

function useComposerToasts(
  error: string | undefined,
  oversized: boolean,
): void {
  useErrorToast(error ? { title: error } : undefined);
  useErrorToast(
    oversized
      ? { title: `Attachment exceeds ${maxBlobUploadMebibytes} MB.` }
      : undefined,
  );
}

function ComposerRequest(layout: ComposerLayout): React.JSX.Element | null {
  if (!hasComposerRequest(layout)) return null;

  return (
    <View
      className={
        layout.wide
          ? 'self-stretch -mb-3 pb-3 rounded-t-xl bg-sidebar/80 shadow-glass web:backdrop-blur-glass web:backdrop-saturate-110'
          : undefined
      }
    >
      {composerRequestContent(layout)}
    </View>
  );
}

function composerRequestContent({
  props,
  controlsHeight,
}: ComposerLayout): React.JSX.Element | null {
  if (props.planProposal)
    return (
      <PlanProposalCard {...props.planProposal} bottomInset={controlsHeight} />
    );

  return props.permissionRequest ? (
    <PermissionRequest {...props.permissionRequest} />
  ) : null;
}

function hasComposerRequest({ props }: ComposerLayout): boolean {
  return Boolean(props.planProposal || props.permissionRequest);
}
