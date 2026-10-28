import { ActionButtons } from '@repo/kit/primitives/actions/action';
import { Text } from '@repo/kit/primitives/content/text';
import { Spacer } from '@repo/kit/primitives/layout/spacer';
import { Stack } from '@repo/kit/primitives/layout/stack';
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
import {
  onPhone,
  useDeclaredHeaderActions,
} from '../../../../sessions/$id/use-plugin-header-actions';
import type { SlotPreviewProps } from './slot-detail';

export const previewSessionTitle = 'Fix login redirect';

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

const placedForPreview = (
  declared: readonly DeclaredHeaderAction[],
  { shows }: SlotVisibility,
): SessionPluginActions =>
  placeSessionHeaderActions(declared.map(withoutPress), {
    phone: onPhone,
    shows,
  });

interface SessionHeaderPreviewProps {
  declared: readonly DeclaredHeaderAction[];
  visibility: SlotVisibility;
}

/*
 * The Session header's trailing Actions under the page's switches, placed as this platform places them: on a desktop
 * the first header actions sit beside "…", and "…" opens to show the rest after Argo's own.
 */
export function SessionHeaderPreview({
  declared,
  visibility,
}: SessionHeaderPreviewProps): React.JSX.Element {
  const placed = placedForPreview(declared, visibility);

  return (
    <Stack direction="row" align="center">
      <Text role="title">{previewSessionTitle}</Text>
      <Spacer />
      <PlacedButtons key={placementKey(placed)} placed={placed} />
    </Stack>
  );
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
