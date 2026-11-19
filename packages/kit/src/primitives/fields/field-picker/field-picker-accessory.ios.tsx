import { Button, HStack } from '@expo/ui/swift-ui';
import {
  buttonBorderShape,
  buttonStyle,
  controlSize,
  disabled,
  labelStyle,
} from '@expo/ui/swift-ui/modifiers';
import type { ReactElement, ReactNode } from 'react';
import { nativeIconName } from '../../../symbols/native-icon-name';
import type {
  FieldPickerAccessory,
  FieldPickerMeter,
} from './field-picker-model';

type RowEndProps = {
  accessory?: FieldPickerAccessory;
  // The App measures audio on the web only, so iOS draws no glyph.
  meter?: FieldPickerMeter;
  children: ReactNode;
};

/*
 * The picker and its button side by side in the Form's row (ADR-0042, 2026-11-19). A bordered button keeps its own
 * press, where a plain one in a Form row would take the whole row's.
 */
export function PickerRowEnd(props: RowEndProps): ReactNode {
  const { accessory } = props;

  if (!accessory) return props.children;

  return (
    <HStack>
      {props.children}
      <Button
        label={accessory.label}
        systemImage={systemImage(accessory)}
        modifiers={[...accessoryLook, disabled(accessory.disabled ?? false)]}
        onPress={accessory.onPress}
      />
    </HStack>
  );
}

const accessoryLook = [
  buttonStyle('bordered'),
  buttonBorderShape('circle'),
  controlSize('small'),
  labelStyle('iconOnly'),
];

type SystemImage = React.ComponentProps<typeof Button>['systemImage'];

// On iOS a kit icon is always an SF Symbol name.
function systemImage(accessory: FieldPickerAccessory): SystemImage {
  const name = nativeIconName(accessory.icon, false);

  return typeof name === 'string' ? name : undefined;
}
