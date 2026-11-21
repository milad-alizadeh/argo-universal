import type * as React from 'react';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '#primitives/content/text';
import { Portal } from '#primitives/overlays/portal';
import { SheetFooter } from '#primitives/overlays/sheet';
import { PinnedFooterKeyboard } from '../pinned-footer/pinned-footer-keyboard';
import { GlyphTile, type GlyphTileProps } from './glyph-tile';

export interface PairingSheetProps extends GlyphTileProps {
  title: string;
  body: string;
  // A tag at the tile's far end, for a page only a developer sees.
  badge?: string;
  // The tile beside the words, for a sheet with nothing else to show.
  inline?: boolean;
  // What backs the words up: a card, a block of code or a field.
  children?: ReactNode;
  // The stack of answers, as CapsuleButtons.
  actions: ReactNode;
}

/*
 * One bottom sheet for every page that stops Add a Server short of a Server: a grabber, a tile, the words, what backs them up, and a stack of pills. It lies over the dimmed scanner it was opened from. App-only: a Plugin has no pairing to stop.
 */
export function PairingSheet(props: PairingSheetProps): React.JSX.Element {
  return (
    <Portal name="pairing-sheet">
      <View className="absolute inset-0 bg-scrim/38" accessibilityViewIsModal>
        <PinnedFooterKeyboard>
          <View className="flex-1 justify-end">
            <Panel {...props} />
          </View>
        </PinnedFooterKeyboard>
      </View>
    </Portal>
  );
}

function Panel(props: PairingSheetProps): React.JSX.Element {
  const { bottom } = useSafeAreaInsets();

  return (
    <View
      className="max-h-full min-h-0 shrink rounded-t-sheet bg-card px-6 pt-2"
      style={{ paddingBottom: bottom }}
    >
      <View className="h-3.5 shrink-0 items-center">
        <View className="h-1 w-9 rounded-full bg-tone-neutral-300" />
      </View>
      <ScrollView
        className="min-h-0 shrink"
        keyboardShouldPersistTaps="handled"
      >
        <Words {...props} />
        {props.children && <View className="mt-5">{props.children}</View>}
      </ScrollView>
      <SheetFooter>
        <View className="mt-6 gap-2.5 pb-8">{props.actions}</View>
      </SheetFooter>
    </View>
  );
}

function Words(props: PairingSheetProps): React.JSX.Element {
  const tile = <GlyphTile tone={props.tone} icon={props.icon} />;

  return props.inline ? (
    <View className="mt-4 flex-row items-center gap-4">
      {tile}
      <Heading {...props} />
    </View>
  ) : (
    <Stacked {...props} tile={tile} />
  );
}

function Stacked(
  props: PairingSheetProps & { tile: ReactNode },
): React.JSX.Element {
  return (
    <View className="mt-4 gap-4">
      <View className="flex-row items-center justify-between">
        {props.tile}
        {props.badge && <Badge label={props.badge} />}
      </View>
      <Heading {...props} />
    </View>
  );
}

function Heading(props: PairingSheetProps): React.JSX.Element {
  return (
    <View className="shrink gap-1.5">
      <Text role="title" className="text-sheet-title font-bold tracking-tight">
        {props.title}
      </Text>
      <Text role="nav-action" tone="muted">
        {props.body}
      </Text>
    </View>
  );
}

function Badge({ label }: { label: string }): React.JSX.Element {
  return (
    <View className="rounded-xl bg-tone-warning-100 px-3 py-1">
      <Text role="badge" className="font-semibold text-tone-warning-800">
        {label}
      </Text>
    </View>
  );
}
