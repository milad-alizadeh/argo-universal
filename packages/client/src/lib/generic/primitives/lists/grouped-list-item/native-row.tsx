import { Column, RNHostView } from '@expo/ui';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import type { ReactElement } from 'react';
import { Platform } from 'react-native';
import { IconSlot, IconSpinner } from '#primitives/display/icon';
import { NativeControl } from '#primitives/native/native-control';
import type { IconName } from '../../../symbols/icon-names';
import { NativeSymbol } from '../../../symbols/native-symbol';
import { GroupedListItemAccessory } from './grouped-list-item-accessory';
import {
  type ResolvedItemProps,
  groupedListItemStatus,
} from './grouped-list-item-props';
import { hiddenFromAccessibility, StatusDot } from './status-dot';

function NativeRowIcon({ icon }: { icon: IconName }): React.JSX.Element {
  return <NativeSymbol name={icon} role="row" />;
}

// An image, such as an Agent's logo, centred in the native row's icon slot.
export function NativeRowImage({
  image,
}: {
  image: ReactElement;
}): React.JSX.Element {
  return (
    <RNHostView matchContents>
      <IconSlot role="row" {...hiddenFromAccessibility}>
        {image}
      </IconSlot>
    </RNHostView>
  );
}

function NativeRowDot(
  props: Pick<ResolvedItemProps, 'needsAttention' | 'status'>,
): React.JSX.Element | null {
  const status = groupedListItemStatus(props);

  if (!status) return null;

  return (
    <RNHostView matchContents>
      <StatusDot status={status} />
    </RNHostView>
  );
}

function NativeRowAccessory({
  accessory,
}: Pick<ResolvedItemProps, 'accessory'>): React.JSX.Element | null {
  if (!accessory) return null;

  return (
    <RNHostView matchContents>
      <GroupedListItemAccessory>{accessory}</GroupedListItemAccessory>
    </RNHostView>
  );
}

export function NativeRowStatus(
  props: Pick<
    ResolvedItemProps,
    'needsAttention' | 'status' | 'accessory' | 'control'
  >,
): React.JSX.Element {
  return (
    <>
      <NativeRowDot {...props} />
      <NativeRowAccessory accessory={props.accessory} />
      {props.control && <NativeControl>{props.control}</NativeControl>}
    </>
  );
}

// The row's image when it has one, else its icon.
function NativeRowGlyph({
  icon,
  leading,
}: {
  icon?: IconName;
  leading?: ReactElement;
}): React.JSX.Element | null {
  if (leading) return <NativeRowImage image={leading} />;

  return icon ? <NativeRowIcon icon={icon} /> : null;
}

// The row's icon or image, or a spinner in the icon's slot while the row loads.
export function NativeRowLeading(
  props: Pick<ResolvedItemProps, 'icon' | 'loading' | 'leading'>,
): React.JSX.Element | null {
  if (props.loading) return <NativeRowSpinner />;

  return <NativeRowGlyph {...props} />;
}

// Paper: a Body-sized spinner in the row icon's slot, the platform's own indicator hosted in the row.
function NativeRowSpinner(): React.JSX.Element {
  return (
    <RNHostView matchContents>
      <IconSlot role="row" {...hiddenFromAccessibility}>
        <IconSpinner iconRole="body" colorClassName="accent-foreground" />
      </IconSlot>
    </RNHostView>
  );
}

// The row's detail control under it, such as an effort slider; the List's row insets pad it.
export function NativeRowDetail({
  detail,
}: Pick<ResolvedItemProps, 'detail'>): React.JSX.Element | null {
  if (!detail) return null;

  return (
    <Column modifiers={Platform.OS === 'ios' ? undefined : [fillMaxWidth()]}>
      <NativeControl>{detail}</NativeControl>
    </Column>
  );
}
