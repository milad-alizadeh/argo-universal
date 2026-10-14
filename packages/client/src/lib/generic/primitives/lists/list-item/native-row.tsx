import { RNHostView } from '@expo/ui';
import type * as React from 'react';
import type { ReactElement } from 'react';
import { IconSlot } from '#primitives/display/icon/icon';
import type { IconName } from '../../../symbols/icon-names';
import { NativeSymbol } from '../../../symbols/native-symbol';
import { NativeControl } from '../../native/native-control';
import { ListItemAccessory } from './list-item-accessory';
import { type ListItemProps, listItemStatus } from './list-item-props';
import { hiddenFromAccessibility, StatusDot } from './status-dot';

export function NativeRowIcon({ icon }: { icon: IconName }): React.JSX.Element {
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
  props: Pick<ListItemProps, 'needsAttention' | 'status'>,
): React.JSX.Element | null {
  const status = listItemStatus(props);

  if (!status) return null;

  return (
    <RNHostView matchContents>
      <StatusDot status={status} />
    </RNHostView>
  );
}

function NativeRowAccessory({
  accessory,
}: Pick<ListItemProps, 'accessory'>): React.JSX.Element | null {
  if (!accessory) return null;

  return (
    <RNHostView matchContents>
      <ListItemAccessory>{accessory}</ListItemAccessory>
    </RNHostView>
  );
}

export function NativeRowStatus(
  props: Pick<
    ListItemProps,
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
export function NativeRowGlyph({
  icon,
  leading,
}: {
  icon?: IconName;
  leading?: ReactElement;
}): React.JSX.Element | null {
  if (leading) return <NativeRowImage image={leading} />;

  return icon ? <NativeRowIcon icon={icon} /> : null;
}
