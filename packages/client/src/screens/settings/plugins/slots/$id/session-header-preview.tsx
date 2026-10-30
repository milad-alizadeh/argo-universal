import { ActionButtons } from '@repo/kit/primitives/actions/action';
import { Text } from '@repo/kit/primitives/content/text';
import { Spacer } from '@repo/kit/primitives/layout/spacer';
import { Stack } from '@repo/kit/primitives/layout/stack';
import { SizeClass } from '@repo/kit/size-class/size-class';
import type * as React from 'react';
import { useState } from 'react';
import {
  type DeclaredHeaderAction,
  placeSessionHeaderActions,
  type SessionMenu,
  type SessionPluginAction,
  type SessionPluginActions,
} from '#features/sessions';
import type { SlotVisibility } from '#features/settings';
import { sessionHeaderActions } from '../../../../sessions/$id/session-header-actions';
import { useDeclaredHeaderActions } from '../../../../sessions/$id/use-plugin-header-actions';
import type { SlotPreviewProps } from './slot-detail';

const previewSessionTitle = 'Fix login redirect';

const doNothing = (): void => undefined;

// Argo's own entries in "…", as an idle Session offers them; the preview opens nothing.
const previewMenu: SessionMenu = {
  archived: false,
  status: 'idle',
  onRename: doNothing,
  onArchive: doNothing,
};

const withoutPress = (declared: DeclaredHeaderAction): SessionPluginAction => ({
  ...declared,
  onPress: doNothing,
});

interface SessionHeaderPreviewProps {
  declared: readonly DeclaredHeaderAction[];
  visibility: SlotVisibility;
}

const placedForPreview = (
  { declared, visibility: { shows } }: SessionHeaderPreviewProps,
  compact: boolean,
): SessionPluginActions =>
  placeSessionHeaderActions(declared.map(withoutPress), {
    phone: compact,
    shows,
  });

/*
 * The Session header's trailing Actions under the page's switches, placed as this window's size class places them: on
 * a wide window the first header actions sit beside "…", and "…" opens to show the rest after Argo's own.
 */
export function SessionHeaderPreview(
  props: SessionHeaderPreviewProps,
): React.JSX.Element {
  return (
    <Stack direction="row" align="center">
      <Text role="title">{previewSessionTitle}</Text>
      <Spacer />
      <SizeClass
        compact={<PreviewButtons {...props} compact />}
        wide={<PreviewButtons {...props} compact={false} />}
      />
    </Stack>
  );
}

// One size class's trailing Actions: a compact window keeps every Plugin action in "…".
function PreviewButtons({
  compact,
  ...props
}: SessionHeaderPreviewProps & { compact: boolean }): React.JSX.Element {
  const placed = placedForPreview(props, compact);

  return <PlacedButtons key={placementKey(placed)} placed={placed} />;
}

/*
 * ActionButtons registers its Actions' shortcuts whenever the array changes, and a new array every render loops the
 * registry; the parent keys this by placement, so a switch rebuilds it and nothing else does.
 */
function PlacedButtons({
  placed,
}: {
  placed: SessionPluginActions;
}): React.JSX.Element {
  const [actions] = useState(() => sessionHeaderActions(previewMenu, placed));

  return <ActionButtons actions={actions} />;
}

const idsOf = (actions: readonly DeclaredHeaderAction[]): string =>
  actions.map(({ pluginId, item }) => `${pluginId}/${item.id}`).join(' ');

const placementKey = ({ beside, menu }: SessionPluginActions): string =>
  `${idsOf(beside)}|${idsOf(menu)}`;

// The preview on the App: what the enabled Plugins' manifests declare, read without starting any of them.
export function LiveSessionHeaderPreview({
  visibility,
}: SlotPreviewProps): React.JSX.Element {
  return (
    <SessionHeaderPreview
      declared={useDeclaredHeaderActions()}
      visibility={visibility}
    />
  );
}
