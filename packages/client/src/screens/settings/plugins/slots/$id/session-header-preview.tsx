import { sessionHeaderSlotId } from '@repo/contracts/plugins/wire';
import { ActionButtons } from '@repo/kit/primitives/actions/action';
import { Text } from '@repo/kit/primitives/content/text';
import { useQuery } from '@tanstack/react-query';
import type * as React from 'react';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import { useTRPC } from '#features/connection';
import {
  type DeclaredHeaderAction,
  placeSessionHeaderActions,
  type SessionMenu,
  type SessionPluginAction,
  type SessionPluginActions,
} from '#features/sessions';
import type { SlotVisibility } from '#features/settings';
import { sessionHeaderActions } from '../../../../sessions/$id/session-header-actions';
import type { SlotPreviewProps } from './slot-detail';

export const previewSessionTitle = 'Fix login redirect';

const ignore = (): void => undefined;

// Argo's own entries in "…", as an idle Session offers them; the preview opens nothing.
const previewMenu: SessionMenu = {
  archived: false,
  status: 'idle',
  onRename: ignore,
  onArchive: ignore,
};

const inert = (declared: DeclaredHeaderAction): SessionPluginAction => ({
  ...declared,
  onPress: ignore,
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
  const placed = placeSessionHeaderActions(declared.map(inert), {
    phone: Platform.OS !== 'web',
    shows: visibility.shows,
  });

  return (
    <View className="flex-row items-center gap-2">
      <Text role="heading" className="flex-1" numberOfLines={1}>
        {previewSessionTitle}
      </Text>
      <PlacedButtons key={placementKey(placed)} placed={placed} />
    </View>
  );
}

// Declared Actions claim their shortcuts whenever they change, so they are built once per placement.
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

const noActions: DeclaredHeaderAction[] = [];

// The preview on the App: what the enabled Plugins' manifests declare, read without starting any of them.
export function LiveSessionHeaderPreview({
  visibility,
}: SlotPreviewProps): React.JSX.Element {
  const trpc = useTRPC();

  const { data = noActions } = useQuery(
    trpc.plugins.declared.queryOptions({ slotId: sessionHeaderSlotId }),
  );

  return <SessionHeaderPreview declared={data} visibility={visibility} />;
}
