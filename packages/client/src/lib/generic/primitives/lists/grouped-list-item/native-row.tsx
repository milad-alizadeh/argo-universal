import { Column, RNHostView } from '@expo/ui';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { Platform } from 'react-native';
import { IconSlot, IconSpinner } from '#primitives/display/icon';
import { NativeControl } from '#primitives/native/native-control';
import type { IconSymbol } from '../../../symbols/icon-symbol';
import { NativeSymbol } from '../../../symbols/native-symbol';
import { GroupedListItemAccessory } from './grouped-list-item-accessory';
import {
  type ResolvedItemProps,
  groupedListItemStatus,
} from './grouped-list-item-props';
import { NativeRowImage } from './native-row-image';
import { hiddenFromAccessibility, StatusDot } from './status-dot';

export { NativeRowImage } from './native-row-image';

function NativeRowIcon({ icon }: { icon: IconSymbol }): React.JSX.Element {
  return <NativeSymbol name={icon} role="row" />;
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
type GlyphProps = Pick<
  ResolvedItemProps,
  'icon' | 'leading' | 'leadingLayout' | 'variant'
>;

function NativeRowGlyph({
  leading,
  leadingLayout: layout,
  ...props
}: GlyphProps): React.JSX.Element | null {
  if (leading)
    return (
      <NativeRowImage image={leading} layout={layout} variant={props.variant} />
    );

  return props.icon ? <NativeRowIcon icon={props.icon} /> : null;
}

// The row's icon or image, or a spinner in the icon's slot while the row loads.
export function NativeRowLeading(
  props: Pick<
    ResolvedItemProps,
    'icon' | 'loading' | 'leading' | 'leadingLayout' | 'variant'
  >,
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
