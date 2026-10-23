// A read-only Material outlined field; a tap opens the stock date dialog, then the time dialog for datetime.
import {
  OutlinedTextField,
  type OutlinedTextFieldProps,
  Text,
  useNativeState,
} from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import { type ComponentType, type ReactElement, useState } from 'react';
import { View } from 'react-native';
import { Host } from '#primitives/native/host';
import { useMaterialPalette } from '#primitives/native/material-palette';
import { requiredLabel } from '../../../required-label';
import { NativeSymbol } from '../../../symbols/native-symbol';
import { DateDialogs, type DialogStep } from './date-picker-dialogs';
import type { DatePickerProps } from './date-picker-props';
import { displayValue } from './date-picker-value';

type DialogState = {
  step: DialogStep;
  setStep: (step: DialogStep) => void;
  round: number;
  close: () => void;
};

// A new round remounts the field, dropping its focus, so the next tap opens the dialog again.
function useDialogState(onBlur?: () => void): DialogState {
  const [step, setStep] = useState<DialogStep>('closed');
  const [round, setRound] = useState(0);

  const close = (): void => {
    setStep('closed');
    setRound((count) => count + 1);
    onBlur?.();
  };

  return { step, setStep, round, close };
}

export function DatePicker(props: DatePickerProps): ReactElement {
  const { step, setStep, round, close } = useDialogState(props.onBlur);

  return (
    <View className="min-h-14">
      <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
        <DateField
          key={`${round}:${props.value ?? ''}`}
          {...props}
          onOpen={() => setStep(props.mode === 'time' ? 'time' : 'date')}
        />
      </Host>
      <DateDialogs {...props} step={step} setStep={setStep} close={close} />
    </View>
  );
}

const FIELD_FLAGS: Pick<
  OutlinedTextFieldProps,
  'readOnly' | 'singleLine' | 'modifiers'
> = { readOnly: true, singleLine: true, modifiers: [fillMaxWidth()] };

type FieldProps = DatePickerProps & { onOpen: () => void };

function DateField(props: FieldProps): ReactElement {
  const text = useNativeState(displayValue(props.value, props.mode));

  return (
    <OutlinedTextField
      value={text}
      {...FIELD_FLAGS}
      enabled={!props.disabled}
      isError={props.invalid}
      onFocusChanged={(focused) => focused && props.onOpen()}
      colors={useMaterialPalette().outlinedFieldColors}
    >
      <FieldSlots {...props} />
    </OutlinedTextField>
  );
}

function FieldSlots(props: DatePickerProps): ReactElement {
  return (
    <>
      <OutlinedTextField.Label>
        <Text>{requiredLabel(props)}</Text>
      </OutlinedTextField.Label>
      <FieldIcon mode={props.mode} />
    </>
  );
}

function FieldIcon(props: Pick<DatePickerProps, 'mode'>): ReactElement {
  return (
    <OutlinedTextField.TrailingIcon>
      <NativeSymbol
        name={props.mode === 'time' ? 'clock' : 'calendar'}
        size="lg"
      />
    </OutlinedTextField.TrailingIcon>
  );
}

DatePicker satisfies ComponentType<DatePickerProps>;
