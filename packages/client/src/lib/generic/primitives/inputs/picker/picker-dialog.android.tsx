import {
  BasicAlertDialog,
  Column,
  Shape,
  Surface,
  Text,
} from '@expo/ui/jetpack-compose';
import {
  fillMaxWidth,
  height,
  padding,
  selectableGroup,
  verticalScroll,
} from '@expo/ui/jetpack-compose/modifiers';
import { createElement } from 'react';
import { useWindowDimensions } from 'react-native';
import { useNativeTheme } from '../../../native-theme';
import { useComposeTextStyle } from '../../native/native-typography';
import { DialogTitle, DialogCancel } from './picker-dialog-content.android';
import { AndroidPickerOption } from './picker-option.android';
import type { PickerProps } from './picker-props';
import { pickerOptionsMessage } from './picker-selection';

export type DialogProps<Value extends string> = PickerProps<Value> & {
  onClose: () => void;
};
const minimumWidth = 280;
const maximumWidth = 560;
const dialogMargin = 48;
const dialogTop = 24;
const dialogBottom = 8;
const dialogRadius = 28;
const optionHeight = 56;
const listFraction = 0.55;

export function AndroidPickerDialog<Value extends string>(
  props: DialogProps<Value>,
): React.JSX.Element {
  return createElement(
    BasicAlertDialog,
    {
      onDismissRequest: props.onClose,
      properties: { usePlatformDefaultWidth: false },
    },
    <DialogSurface {...props} />,
  );
}

function DialogSurface<Value extends string>(
  props: DialogProps<Value>,
): React.JSX.Element {
  return createElement(
    Surface,
    useDialogSurfaceProps(),
    <DialogContent {...props} />,
  );
}

function useDialogSurfaceProps(): React.ComponentProps<typeof Surface> {
  const { colors } = useNativeTheme();
  const window = useWindowDimensions();
  const dialogWidth = Math.min(
    maximumWidth,
    Math.max(minimumWidth, window.width - dialogMargin),
  );
  return {
    color: colors.muted,
    shape: dialogShape(),
    modifiers: [fillMaxWidth(dialogWidth / window.width)],
  };
}

function dialogShape(): NonNullable<
  React.ComponentProps<typeof Surface>['shape']
> {
  return Shape.RoundedCorner({
    cornerRadii: {
      topStart: dialogRadius,
      topEnd: dialogRadius,
      bottomStart: dialogRadius,
      bottomEnd: dialogRadius,
    },
  });
}

function DialogContent<Value extends string>(
  props: DialogProps<Value>,
): React.JSX.Element {
  return createElement(
    Column,
    {
      modifiers: [padding(0, dialogTop, 0, dialogBottom)],
    },
    <DialogTitle label={props.label} />,
    <DialogOptions {...props} />,
    <DialogCancel onClose={props.onClose} />,
  );
}

function DialogOptions<Value extends string>(
  props: DialogProps<Value>,
): React.JSX.Element {
  const style = useComposeTextStyle('body');
  const message = pickerOptionsMessage(props);
  return message ? (
    <Text style={style}>{message}</Text>
  ) : (
    <ScrollableOptions {...props} />
  );
}

function ScrollableOptions<Value extends string>(
  props: DialogProps<Value>,
): React.JSX.Element {
  const modifiers = useOptionScrollModifiers(props.options.length);
  return createElement(
    Column,
    { modifiers },
    props.options.map((option) => (
      <AndroidPickerOption key={option.value} {...props} option={option} />
    )),
  );
}

function useOptionScrollModifiers(count: number): ReturnType<typeof height>[] {
  const window = useWindowDimensions();
  const listHeight = Math.min(
    count * optionHeight,
    window.height * listFraction,
  );
  return [height(Math.round(listHeight)), verticalScroll(), selectableGroup()];
}
