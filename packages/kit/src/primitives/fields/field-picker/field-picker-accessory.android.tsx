import type { ReactElement, ReactNode } from 'react';
import { IconButtonControl } from '#primitives/actions/icon-button';
import type {
  FieldPickerAccessory,
  FieldPickerMeter,
} from './field-picker-model';

type RowEndProps = {
  accessory?: FieldPickerAccessory;
  // A level is measured on the web only, so Android draws no glyph.
  meter?: FieldPickerMeter;
  children: ReactNode;
};

// Android's row draws its button as the Material ListItem's trailing content (AccessoryButton), so the row is itself.
export const PickerRowEnd = (props: RowEndProps): ReactNode => props.children;

// The row's button, a tonal icon button in the ListItem's trailing slot (ADR-0042, 2026-11-19).
export function AccessoryButton(props: {
  accessory?: FieldPickerAccessory;
}): ReactElement | undefined {
  const { accessory } = props;

  return accessory ? <ControlOf accessory={accessory} /> : undefined;
}

const ControlOf = ({
  accessory,
}: {
  accessory: FieldPickerAccessory;
}): ReactElement => (
  <IconButtonControl
    icon={accessory.icon}
    size="sm"
    variant="secondary"
    accessibilityLabel={accessory.label}
    disabled={accessory.disabled}
    onPress={accessory.onPress}
  />
);
